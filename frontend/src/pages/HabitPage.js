import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { api, errorText, lastSevenDays } from "@/lib/api";
import { StatusTag } from "@/components/StatusTag";
import { Comments } from "@/components/Comments";

export default function HabitPage() {
  const { id } = useParams();
  const [habit, setHabit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/habits/${id}`).then((r) => setHabit(r.data)).catch((e) => setError(errorText(e)));
  }, [id]);

  if (error) return <p className="text-stone-600" data-testid="habit-error">{error}</p>;
  if (!habit) return null;

  const toggle = async (date, done) => {
    try {
      const { data } = await api.post(`/habits/${id}/ticks`, { date, done });
      setHabit(data);
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const done = new Set(habit.completions);

  return (
    <div className="space-y-10 fade-up">
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {habit.is_owner && <StatusTag shared={habit.shared} testId="habit-status" />}
          {!habit.is_owner && <span className="text-sm text-stone-500" data-testid="habit-owner">by {habit.owner_name}</span>}
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-stone-900" data-testid="habit-name">{habit.name}</h1>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500 mb-2">When I do it</p>
          <p className="text-stone-600 leading-relaxed whitespace-pre-wrap" data-testid="habit-when">{habit.when || "—"}</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-4" data-testid="days-done-stat">
          <span className="text-stone-600">Days done: </span><span className="font-heading text-2xl font-bold text-emerald-700">{habit.days_done}</span>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-4" data-testid="current-streak-stat">
          <span className="text-stone-600">Current streak: </span><span className="font-heading text-2xl font-bold text-emerald-700">{habit.current_streak}</span>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Last 7 days</h2>
        <ul className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100" data-testid="last-7-days-list">
          {lastSevenDays().map((d) => (
            <li key={d} className="flex items-center gap-4 px-6 py-3.5">
              <Checkbox id={`day-${d}`} checked={done.has(d)} disabled={!habit.is_owner}
                onCheckedChange={(v) => toggle(d, v === true)} data-testid={`7-day-checkbox-${d}`} className="check" />
              <label htmlFor={`day-${d}`} className="font-mono text-sm text-stone-700 cursor-pointer">{d}</label>
            </li>
          ))}
        </ul>
      </section>

      <Comments habitId={habit.id} />
    </div>
  );
}
