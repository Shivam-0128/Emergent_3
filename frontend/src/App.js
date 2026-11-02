import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AuthForm } from "@/components/AuthForm";
import { Layout } from "@/components/Layout";
import MyHabits from "@/pages/MyHabits";
import Community from "@/pages/Community";
import HabitPage from "@/pages/HabitPage";

const Public = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return <div className="min-h-screen bg-stone-50" />;
  return user ? <Navigate to="/habits" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<Public><AuthForm mode="signup" /></Public>} />
          <Route path="/signin" element={<Public><AuthForm mode="signin" /></Public>} />
          <Route element={<Layout />}>
            <Route path="/habits" element={<MyHabits />} />
            <Route path="/habits/:id" element={<HabitPage />} />
            <Route path="/community" element={<Community />} />
          </Route>
          <Route path="*" element={<Navigate to="/habits" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </AuthProvider>
  );
}

export default App;
