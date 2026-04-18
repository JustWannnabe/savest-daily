import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactions } from "@/hooks/useTransactions";
import { formatINR } from "@/lib/format";

type Msg = { role: "user" | "assistant"; content: string; id: string };

const QUICK = [
  { id: "save", label: "How can I save more this month?" },
  { id: "over", label: "Where am I overspending?" },
  { id: "5030", label: "Give me a 50/30/20 plan for ₹15,000" },
];

export default function Mentor() {
  const { data: txs = [] } = useTransactions();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "hi",
      role: "assistant",
      content:
        "Hey 👋 I'm your MoneyFlow mentor. I'll help you spot saving opportunities and build healthier money habits. Try a Quick Insight below to start.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const insights = useMemo(() => {
    const expenses = txs.filter((t) => t.type === "expense");
    const total = expenses.reduce((s, t) => s + t.amount, 0);
    const byCat = new Map<string, number>();
    expenses.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount));
    const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    const second = sorted[1];
    return { total, top, second, count: expenses.length };
  }, [txs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const reply = (id: string): string => {
    const { top, second, total, count } = insights;
    if (id === "save") {
      if (!top) return "Once you log a few transactions, I can pinpoint exactly where to trim. Try adding 5–10 from this week.";
      return `Looking at your last ${count} expenses (total ${formatINR(total)}):\n\n• Your biggest category is **${top[0]}** at ${formatINR(top[1])}.\n• Try a 14-day "no-${top[0].toLowerCase()}" challenge — even cutting 30% saves about ${formatINR(top[1] * 0.3)}.\n• Set a weekly cap of ${formatINR(top[1] / 4 * 0.7)} for ${top[0]} and you'll feel the difference by month-end.`;
    }
    if (id === "over") {
      if (!top) return "Add some transactions and I'll show you exactly where the leaks are 🚰";
      const share = total ? Math.round((top[1] / total) * 100) : 0;
      return `Your top spend is **${top[0]}** — ${formatINR(top[1])}, which is **${share}%** of everything you've spent.${second ? `\n\nNext up: ${second[0]} at ${formatINR(second[1])}.` : ""}\n\nA healthy rule of thumb: no single non-essential category should exceed 25% of total spend. ${share > 25 ? "You're above that — worth a look." : "You're within range — nice balance!"}`;
    }
    if (id === "5030") {
      return "Here's a clean 50/30/20 split for **₹15,000/month**:\n\n• **₹7,500 — Needs (50%)**: rent share, groceries, transport, bills.\n• **₹4,500 — Wants (30%)**: dining out, subscriptions, shopping, entertainment.\n• **₹3,000 — Savings (20%)**: emergency fund first (₹15k goal), then SIPs or fixed deposits.\n\nTip: automate the ₹3,000 transfer to savings on the 1st of each month. What you don't see, you don't spend 💸";
    }
    return "I can answer the Quick Insights for now — full chat is coming soon!";
  };

  const send = (id: string, label: string) => {
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: label };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: reply(id) }]);
    }, 700);
  };

  const sendFree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: text }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: "assistant", content: "I can answer the Quick Insights below for now — full free-form chat is coming soon!" },
      ]);
    }, 700);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-9rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {typing && (
          <div className="flex items-end gap-2">
            <Avatar />
            <div className="rounded-2xl rounded-bl-sm bg-secondary px-4 py-3 flex gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground dot-1" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground dot-2" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground dot-3" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="pt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.id}
              onClick={() => send(q.id, q.label)}
              className="text-xs md:text-sm font-medium px-3 py-1.5 rounded-full bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors border border-border"
            >
              {q.label}
            </button>
          ))}
        </div>
        <form onSubmit={sendFree} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your money…"
            className="rounded-xl h-11"
          />
          <Button type="submit" size="icon" className="h-11 w-11 rounded-xl shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

const Avatar = () => (
  <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-accent to-accent/60 grid place-items-center">
    <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
  </div>
);

const Bubble = ({ msg }: { msg: Msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 animate-fade-in-up ${isUser ? "justify-end" : ""}`}>
      {!isUser && <Avatar />}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-foreground text-background rounded-br-sm"
            : "bg-secondary text-foreground rounded-bl-sm"
        }`}
      >
        {formatBold(msg.content)}
      </div>
    </div>
  );
};

const formatBold = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
