import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, errorText } from "@/lib/api";

export const Comments = ({ habitId }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/habits/${habitId}/comments`).then((r) => setComments(r.data)).catch(() => {});
  }, [habitId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/habits/${habitId}/comments`, { text });
      setComments([...comments, data]);
      setText("");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5" data-testid="comments-section">
      <h2 className="font-heading text-lg font-semibold text-stone-800">Comments</h2>
      <ul className="space-y-3" data-testid="comments-list">
        {comments.length === 0 && <li className="text-sm text-stone-500" data-testid="comments-empty">No comments yet.</li>}
        {comments.map((c) => (
          <li key={c.id} data-testid={`comment-${c.id}`} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
            <p className="text-sm font-semibold text-stone-900" data-testid="comment-author">{c.author_name}</p>
            <p className="text-stone-600 whitespace-pre-wrap mt-1" data-testid="comment-text">{c.text}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-3">
        <Label htmlFor="comment" className="text-stone-700">Comment</Label>
        <Textarea id="comment" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          data-testid="comment-input" className="field" />
        <button type="submit" disabled={busy || !text.trim()} data-testid="post-comment-button" className="btn-primary h-11 px-6">
          Post comment
        </button>
      </form>
    </section>
  );
};
