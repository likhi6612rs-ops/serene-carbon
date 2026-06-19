import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getInsight } from "@/lib/ai-insights.functions";
import type { FootprintBreakdown } from "@/lib/carbon";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function InsightChat({ footprint }: { footprint: FootprintBreakdown }) {
  const ask = useServerFn(getInsight);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm SERENE. Ask me about your footprint and I'll suggest a small change you can try.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim().slice(0, 1000);
    if (!trimmed || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await ask({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          footprint,
        },
      });
      setMessages([...next, { role: "assistant", content: res.reply || "(no reply)" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="insight-heading"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <h2 id="insight-heading" className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        Insight Chat
      </h2>
      <p className="text-xs text-muted-foreground">
        AI-powered tips based on today's logged footprint.
      </p>

      <div
        role="log"
        aria-live="polite"
        className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-3 text-sm"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground"
                : "mr-auto max-w-[85%] rounded-2xl bg-card px-3 py-2 text-foreground shadow-sm"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto inline-flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <label htmlFor="insight-input" className="sr-only">
          Ask SERENE for a tip
        </label>
        <input
          id="insight-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How can I cut my transport emissions?"
          maxLength={1000}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}