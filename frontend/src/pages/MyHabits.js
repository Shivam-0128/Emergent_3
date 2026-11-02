import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { AddHabitForm } from "@/components/AddHabitForm";
import { StatusTag } from "@/components/StatusTag";

export default function MyHabits() {
  const [habits, setHabits] = useState(null);

  useEffect(() => {
    api.get("/habits/mine").then((r) => setHabits(r.data)).catch(() => setHabits([]));
  }, []);

  return (
    <div className="space-y-10 fade-up">
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">My habits</h1>
      <AddHabitForm onAdded={(h) => setHabits([h, ...(habits || [])])} />
      <ul className="space-y-3" data-testid="my-habits-list">
        {habits && habits.length === 0 && (
          <li className="text-stone-500" data-testid="my-habits-empty">No habits yet. Add your first one above.</li>
        )}
        {habits?.map((h) => (
          <li key={h.id} data-testid={`habit-card-${h.id}`}
            className="bg-white border border-stone-200 rounded-2xl px-6 py-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <Link to={`/habits/${h.id}`} data-testid="habit-card-name"
              className="font-heading font-semibold text-stone-900 hover:text-emerald-700 transition-colors duration-200 truncate">
              {h.name}
            </Link>
            <StatusTag shared={h.shared} testId="habit-card-status" />
          </li>
        ))}
      </ul>
    </div>
  );
}
