import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false));
  }, []);

  const authenticate = async (path, body) => {
    const { data } = await api.post(path, body);
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const signOut = async () => {
    await api.post("/auth/signout").catch(() => {});
    localStorage.removeItem("token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, authenticate, signOut }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
