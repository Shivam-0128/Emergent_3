import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api, errorText } from "@/lib/api";

export const AddHabitForm = ({ onAdded }) => {
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/habits", { name, when, shared });
      onAdded(data);
      setName(""); setWhen(""); setShared(false);
      toast.success("Habit added");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} data-testid="add-habit-form" className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
      <div className="space-y-2">
        <Label htmlFor="habit-name" className="text-stone-700">Habit name</Label>
        <Input id="habit-name" required value={name} onChange={(e) => setName(e.target.value)}
          data-testid="habit-name-input" className="field h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="habit-when" className="text-stone-700">When I do it</Label>
        <Textarea id="habit-when" value={when} onChange={(e) => setWhen(e.target.value)} rows={3}
          placeholder="e.g. After my morning coffee, when the house is still quiet"
          data-testid="when-i-do-it-input" className="field" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Checkbox id="habit-share" checked={shared} onCheckedChange={(v) => setShared(v === true)}
            data-testid="share-checkbox" className="check" />
          <Label htmlFor="habit-share" className="text-stone-700 cursor-pointer">Share with the community</Label>
        </div>
        <button type="submit" disabled={busy} data-testid="add-habit-button" className="btn-primary h-11 px-6">Add habit</button>
      </div>
    </form>
  );
};
