# Regression tests for Habit Circle: auth, habits, ticks/streak, community, comments, privacy
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def _signup(name):
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={"display_name": name, "email": email, "password": "pass123"})
    assert r.status_code == 200, r.text
    d = r.json()
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {d['token']}"})
    return s, email, d


def today(off=0):
    return (datetime.now(timezone.utc).date() - timedelta(days=off)).isoformat()


@pytest.fixture(scope="module")
def users():
    a, a_email, a_d = _signup("TEST_Alice")
    b, b_email, b_d = _signup("TEST_Bob")
    return {"a": a, "b": b, "a_email": a_email, "a_d": a_d, "b_d": b_d}


@pytest.fixture(scope="module")
def habits(users):
    a = users["a"]
    p = a.post(f"{API}/habits", json={"name": "TEST_private", "when": "morning"}).json()
    s = a.post(f"{API}/habits", json={"name": "TEST_shared", "when": "evening", "shared": True}).json()
    return {"private": p, "shared": s}


# Auth
class TestAuth:
    def test_signup_returns_user_token_cookie(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/signup", json={"display_name": "TEST_C", "email": email, "password": "pass123"})
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == email and d["user"]["display_name"] == "TEST_C"
        assert "password_hash" not in d["user"]
        sc = r.headers.get("set-cookie", "")
        assert "access_token" in sc and "HttpOnly" in sc

    def test_duplicate_signup(self, users):
        r = requests.post(f"{API}/auth/signup", json={"display_name": "x", "email": users["a_email"], "password": "pass123"})
        assert r.status_code == 400

    def test_signin_ok_and_bad(self, users):
        r = requests.post(f"{API}/auth/signin", json={"email": users["a_email"].upper(), "password": "pass123"})
        assert r.status_code == 200 and r.json()["user"]["email"] == users["a_email"]
        r = requests.post(f"{API}/auth/signin", json={"email": users["a_email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_and_unauth(self, users):
        r = users["a"].get(f"{API}/auth/me")
        assert r.status_code == 200 and r.json()["display_name"] == "TEST_Alice"
        assert requests.get(f"{API}/auth/me").status_code == 401
        assert requests.get(f"{API}/habits/mine").status_code == 401

    def test_cookie_auth(self, users):
        s = requests.Session()
        s.post(f"{API}/auth/signin", json={"email": users["a_email"], "password": "pass123"})
        assert s.get(f"{API}/auth/me").status_code == 200


# Habits
class TestHabits:
    def test_create_defaults(self, habits):
        assert habits["private"]["shared"] is False
        assert habits["shared"]["shared"] is True
        assert habits["private"]["days_done"] == 0 and habits["private"]["current_streak"] == 0

    def test_mine_only_own(self, users, habits):
        a_ids = {h["id"] for h in users["a"].get(f"{API}/habits/mine").json()}
        assert {habits["private"]["id"], habits["shared"]["id"]} <= a_ids
        b_ids = {h["id"] for h in users["b"].get(f"{API}/habits/mine").json()}
        assert not (a_ids & b_ids)

    def test_empty_name_rejected(self, users):
        assert users["a"].post(f"{API}/habits", json={"name": ""}).status_code == 422

    def test_community_only_shared(self, users, habits):
        data = users["b"].get(f"{API}/habits/community").json()
        ids = {h["id"] for h in data}
        assert habits["shared"]["id"] in ids and habits["private"]["id"] not in ids
        assert all(h["shared"] for h in data)
        h = next(h for h in data if h["id"] == habits["shared"]["id"])
        assert h["owner_name"] == "TEST_Alice" and h["when"] == "evening"

    def test_private_404_for_other(self, users, habits):
        pid = habits["private"]["id"]
        assert users["b"].get(f"{API}/habits/{pid}").status_code == 404
        assert users["b"].get(f"{API}/habits/{pid}/comments").status_code == 404
        assert users["b"].post(f"{API}/habits/{pid}/comments", json={"text": "hi"}).status_code == 404
        assert users["b"].post(f"{API}/habits/{pid}/ticks", json={"date": today(), "done": True}).status_code == 404
        assert users["a"].get(f"{API}/habits/{pid}").status_code == 200

    def test_invalid_id_404(self, users):
        assert users["a"].get(f"{API}/habits/notanid").status_code == 404


# Ticks & streak
class TestTicks:
    def test_tick_untick_streak(self, users, habits):
        a, hid = users["a"], habits["private"]["id"]
        for off in (0, 1, 3):
            r = a.post(f"{API}/habits/{hid}/ticks", json={"date": today(off), "done": True})
            assert r.status_code == 200
        d = a.get(f"{API}/habits/{hid}").json()
        assert d["days_done"] == 3 and d["current_streak"] == 2
        # duplicate tick idempotent
        d = a.post(f"{API}/habits/{hid}/ticks", json={"date": today(0), "done": True}).json()
        assert d["days_done"] == 3
        # untick today -> streak from most recent done day (yesterday): 1
        d = a.post(f"{API}/habits/{hid}/ticks", json={"date": today(0), "done": False}).json()
        assert d["days_done"] == 2 and d["current_streak"] == 1
        d = a.get(f"{API}/habits/{hid}").json()
        assert d["days_done"] == 2

    def test_tick_bad_dates(self, users, habits):
        a, hid = users["a"], habits["private"]["id"]
        assert a.post(f"{API}/habits/{hid}/ticks", json={"date": "2020-01-01", "done": True}).status_code == 400
        assert a.post(f"{API}/habits/{hid}/ticks", json={"date": "bad", "done": True}).status_code == 400
        assert a.post(f"{API}/habits/{hid}/ticks", json={"date": "2026-13-01", "done": True}).status_code == 400

    def test_non_owner_403(self, users, habits):
        sid = habits["shared"]["id"]
        r = users["b"].post(f"{API}/habits/{sid}/ticks", json={"date": today(), "done": True})
        assert r.status_code == 403
        d = users["b"].get(f"{API}/habits/{sid}").json()
        assert d["is_owner"] is False


# Comments
class TestComments:
    def test_b_comments_a_sees(self, users, habits):
        sid = habits["shared"]["id"]
        r = users["b"].post(f"{API}/habits/{sid}/comments", json={"text": "TEST_nice"})
        assert r.status_code == 200
        c = r.json()
        assert c["author_name"] == "TEST_Bob" and c["text"] == "TEST_nice" and c["id"]
        lst = users["a"].get(f"{API}/habits/{sid}/comments").json()
        assert any(x["id"] == c["id"] and x["author_name"] == "TEST_Bob" for x in lst)
        assert all("_id" not in x for x in lst)

    def test_empty_comment_rejected(self, users, habits):
        sid = habits["shared"]["id"]
        assert users["b"].post(f"{API}/habits/{sid}/comments", json={"text": ""}).status_code == 422
        assert users["b"].post(f"{API}/habits/{sid}/comments", json={"text": "   "}).status_code == 400
