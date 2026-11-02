from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Annotated, Optional, List

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
TOKEN_DAYS = 30

app = FastAPI()
api = APIRouter(prefix="/api")

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls(**doc)

    def to_mongo(self):
        d = self.model_dump(by_alias=True, exclude={"id"})
        if self.id:
            d["_id"] = ObjectId(self.id)
        return d


class User(BaseDocument):
    display_name: str
    email: str
    password_hash: str
    created_at: str


class Habit(BaseDocument):
    owner_id: str
    owner_name: str
    name: str
    when: str
    shared: bool = False
    completions: List[str] = []
    created_at: str


class Comment(BaseDocument):
    habit_id: str
    author_id: str
    author_name: str
    text: str
    created_at: str


class SignUpIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6)


class SignInIn(BaseModel):
    email: EmailStr
    password: str


class HabitIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    when: str = Field(default="", max_length=2000)
    shared: bool = False


class TickIn(BaseModel):
    date: str
    done: bool


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def public_user(u: User):
    return {"id": u.id, "display_name": u.display_name, "email": u.email}


def auth_response(response: Response, u: User):
    token = jwt.encode({"sub": u.id, "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)}, JWT_SECRET, algorithm=JWT_ALG)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=TOKEN_DAYS * 86400, path="/")
    return {"user": public_user(u), "token": token}


async def current_user(request: Request) -> User:
    token = request.cookies.get("access_token")
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        token = header[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        raise HTTPException(401, "Invalid session")
    if not doc:
        raise HTTPException(401, "User not found")
    return User.from_mongo(doc)


def streak(completions: List[str]) -> int:
    days = sorted({date.fromisoformat(d) for d in completions}, reverse=True)
    if not days:
        return 0
    count, cur = 1, days[0]
    for d in days[1:]:
        if d == cur - timedelta(days=1):
            count, cur = count + 1, d
        else:
            break
    return count


def habit_out(h: Habit, user_id: str):
    return {
        "id": h.id, "name": h.name, "when": h.when, "shared": h.shared,
        "owner_id": h.owner_id, "owner_name": h.owner_name,
        "completions": sorted(h.completions), "days_done": len(set(h.completions)),
        "current_streak": streak(h.completions), "is_owner": h.owner_id == user_id,
    }


async def get_visible_habit(habit_id: str, user: User) -> Habit:
    if not ObjectId.is_valid(habit_id):
        raise HTTPException(404, "Habit not found")
    doc = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not doc:
        raise HTTPException(404, "Habit not found")
    h = Habit.from_mongo(doc)
    if not h.shared and h.owner_id != user.id:
        raise HTTPException(404, "Habit not found")
    return h


@api.post("/auth/signup")
async def signup(body: SignUpIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    u = User(display_name=body.display_name.strip(), email=email, password_hash=pw, created_at=now_iso())
    res = await db.users.insert_one(u.to_mongo())
    u.id = str(res.inserted_id)
    return auth_response(response, u)


@api.post("/auth/signin")
async def signin(body: SignInIn, response: Response):
    doc = await db.users.find_one({"email": body.email.lower()})
    if not doc or not bcrypt.checkpw(body.password.encode(), doc["password_hash"].encode()):
        raise HTTPException(401, "Incorrect email or password")
    return auth_response(response, User.from_mongo(doc))


@api.post("/auth/signout")
async def signout(response: Response):
    response.delete_cookie("access_token", path="/", secure=True, samesite="none")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: User = Depends(current_user)):
    return public_user(user)


@api.get("/habits/mine")
async def my_habits(user: User = Depends(current_user)):
    docs = await db.habits.find({"owner_id": user.id}).sort("created_at", -1).to_list(1000)
    return [habit_out(Habit.from_mongo(d), user.id) for d in docs]


@api.post("/habits")
async def add_habit(body: HabitIn, user: User = Depends(current_user)):
    h = Habit(owner_id=user.id, owner_name=user.display_name, name=body.name.strip(), when=body.when.strip(), shared=body.shared, created_at=now_iso())
    res = await db.habits.insert_one(h.to_mongo())
    h.id = str(res.inserted_id)
    return habit_out(h, user.id)


@api.get("/habits/community")
async def community(user: User = Depends(current_user)):
    docs = await db.habits.find({"shared": True}).sort("created_at", -1).to_list(1000)
    return [habit_out(Habit.from_mongo(d), user.id) for d in docs]


@api.get("/habits/{habit_id}")
async def get_habit(habit_id: str, user: User = Depends(current_user)):
    return habit_out(await get_visible_habit(habit_id, user), user.id)


@api.post("/habits/{habit_id}/ticks")
async def tick(habit_id: str, body: TickIn, user: User = Depends(current_user)):
    h = await get_visible_habit(habit_id, user)
    if h.owner_id != user.id:
        raise HTTPException(403, "Only the owner can change this habit")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", body.date):
        raise HTTPException(400, "Invalid date")
    try:
        d = date.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Invalid date")
    if abs((d - datetime.now(timezone.utc).date()).days) > 8:
        raise HTTPException(400, "Date must be within the last 7 days")
    op = "$addToSet" if body.done else "$pull"
    await db.habits.update_one({"_id": ObjectId(h.id)}, {op: {"completions": body.date}})
    return habit_out(Habit.from_mongo(await db.habits.find_one({"_id": ObjectId(h.id)})), user.id)


@api.get("/habits/{habit_id}/comments")
async def list_comments(habit_id: str, user: User = Depends(current_user)):
    h = await get_visible_habit(habit_id, user)
    docs = await db.comments.find({"habit_id": h.id}).sort("created_at", 1).to_list(1000)
    return [Comment.from_mongo(d).model_dump() for d in docs]


@api.post("/habits/{habit_id}/comments")
async def post_comment(habit_id: str, body: CommentIn, user: User = Depends(current_user)):
    h = await get_visible_habit(habit_id, user)
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Comment cannot be empty")
    c = Comment(habit_id=h.id, author_id=user.id, author_name=user.display_name, text=text, created_at=now_iso())
    res = await db.comments.insert_one(c.to_mongo())
    c.id = str(res.inserted_id)
    return c.model_dump()


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.habits.create_index("owner_id")
    await db.comments.create_index("habit_id")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
