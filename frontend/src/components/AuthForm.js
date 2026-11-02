import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { errorText } from "@/lib/api";

export const AuthForm = ({ mode }) => {
  const isUp = mode === "signup";
  const title = isUp ? "Sign up" : "Sign in";
  const { authenticate } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = isUp ? form : { email: form.email, password: form.password };
      await authenticate(isUp ? "/auth/signup" : "/auth/signin", body);
      navigate("/habits");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={key} className="text-stone-700">{label}</Label>
      <Input id={key} type={type} required value={form[key]} onChange={set(key)}
        data-testid={`${key.replace("_", "-")}-input`} className="field h-11" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex items-center px-6 py-16">
      <div className="w-full max-w-md mx-auto fade-up">
        <div className="flex items-center gap-2 mb-10 text-emerald-700">
          <Sprout className="w-6 h-6" />
          <span className="font-heading font-bold text-lg">Habit Circle</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 mb-3">{title}</h1>
        <p className="text-stone-600 mb-10">
          {isUp ? "Track your daily habits with friends and colleagues." : "Welcome back. Pick up where you left off."}
        </p>
        <form onSubmit={submit} data-testid={`${mode}-form`}
          className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm space-y-6">
          {isUp && field("display_name", "Display name")}
          {field("email", "Email", "email")}
          {field("password", "Password", "password")}
          {error && <p data-testid="auth-error" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} data-testid={`${mode}-button`} className="btn-primary w-full h-11">
            {title}
          </button>
        </form>
        <p className="mt-6 text-sm text-stone-600">
          {isUp ? "Already have an account? " : "New here? "}
          <Link to={isUp ? "/signin" : "/signup"} data-testid={isUp ? "go-signin-link" : "go-signup-link"}
            className="text-emerald-700 font-semibold hover:underline">
            {isUp ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </div>
    </div>
  );
};
