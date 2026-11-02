import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

export default function Community() {
  const [habits, setHabits] = useState(null);

  useEffect(() => {
    api.get("/habits/community").then((r) => setHabits(r.data)).catch(() => setHabits([]));
  }, []);

  return (
    <div className="space-y-10 fade-up">
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">Community</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="community-feed">
        {habits && habits.length === 0 && (
          <p className="text-stone-500" data-testid="community-empty">No shared habits yet.</p>
        )}
        {habits?.map((h) => (
          <article key={h.id} data-testid={`community-habit-${h.id}`}
            className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200 flex flex-col gap-3">
            <Link to={`/habits/${h.id}`} data-testid="community-habit-name"
              className="font-heading text-xl font-semibold text-stone-900 hover:text-emerald-700 transition-colors duration-200">
              {h.name}
            </Link>
            <p className="text-sm text-stone-500" data-testid="community-habit-owner">by {h.owner_name}</p>
            <p className="text-stone-600 leading-relaxed whitespace-pre-wrap" data-testid="community-habit-when">{h.when}</p>
            <p className="text-sm font-semibold text-emerald-800 mt-auto" data-testid="community-habit-days-done">
              Days done: {h.days_done}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
