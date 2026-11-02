import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Sprout, ListChecks, Users, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/habits", label: "My habits", icon: ListChecks, id: "my-habits" },
  { to: "/community", label: "Community", icon: Users, id: "community" },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 ${
    isActive ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
  }`;

const topCls = ({ isActive }) =>
  `text-sm font-semibold transition-colors duration-200 ${isActive ? "text-emerald-700" : "text-stone-600 hover:text-stone-900"}`;

export const Layout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (user === null) return <div className="min-h-screen bg-stone-50" />;
  if (user === false) return <Navigate to="/signin" replace />;

  const out = async () => {
    await signOut();
    navigate("/signin");
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      <aside className="w-64 flex-shrink-0 border-r border-stone-200 bg-white hidden md:flex flex-col p-6" data-testid="sidebar">
        <div className="flex items-center gap-2 text-emerald-700 mb-10 px-2">
          <Sprout className="w-6 h-6" />
          <span className="font-heading font-bold text-lg">Habit Circle</span>
        </div>
        <nav className="space-y-1 flex-1">
          {links.map(({ to, label, icon: Icon, id }) => (
            <NavLink key={to} to={to} className={linkCls} data-testid={`sidebar-${id}`}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 text-xs text-stone-500" data-testid="sidebar-user-name">Signed in as {user.display_name}</div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-stone-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 md:px-8">
          <nav className="flex items-center gap-6">
            <span className="md:hidden text-emerald-700"><Sprout className="w-5 h-5" /></span>
            {links.map(({ to, label, id }) => (
              <NavLink key={to} to={to} className={topCls} data-testid={`nav-${id}`}>{label}</NavLink>
            ))}
          </nav>
          <button onClick={out} data-testid="nav-signout"
            className="flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900 px-3 py-2 rounded-full hover:bg-stone-100 transition-colors duration-200">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl px-4 md:px-10 py-8 md:py-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
