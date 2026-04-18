import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactions } from "@/hooks/useTransactions";
import { formatINR } from "@/lib/format";

type Msg = { role: "user" | "assistant"; content: string; id: string };

const QUICK = [
  { id: "save", label: "Bhai, kahan se save karu?" },
  { id: "over", label: "Kahan overspend ho raha hai?" },
  { id: "invest", label: "Investing kab shuru karu?" },
  { id: "5030", label: "₹15,000 ka 50/30/20 plan do" },
];

export default function Mentor() {
  const { data: txs = [] } = useTransactions();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "hi",
      role: "assistant",
      content:
        "Arre wah, aa gaya tu! 👋 Main tera MoneyFlow mentor — paise bachane se lekar invest karne tak, sab samjhaunga. Niche koi quick insight tap kar, shuru karte hain.",
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

    // This week vs last week food spend
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const food = expenses.filter((t) => t.category === "Food & Drink");
    const foodThisWeek = food
      .filter((t) => new Date(t.occurred_at) >= weekStart)
      .reduce((s, t) => s + t.amount, 0);
    const foodLastWeek = food
      .filter((t) => {
        const d = new Date(t.occurred_at);
        return d >= lastWeekStart && d < weekStart;
      })
      .reduce((s, t) => s + t.amount, 0);

    const subs = expenses.filter((t) => t.is_subscription);
    const subsTotal = subs.reduce((s, t) => s + t.amount, 0);

    return {
      total,
      top: sorted[0],
      second: sorted[1],
      count: expenses.length,
      foodThisWeek,
      foodLastWeek,
      subsTotal,
    };
  }, [txs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const reply = (id: string): string => {
    const { top, second, total, count, foodThisWeek, foodLastWeek, subsTotal } = insights;
    if (id === "save") {
      if (!top) return "Pehle thode transactions add kar de, phir batata hoon kahan se kaatna hai 💸";
      const saveTarget = Math.round(top[1] * 0.3);
      return `Bhai, tere last ${count} kharchon ko dekha (total ${formatINR(total)}):\n\n• Sabse bada hole hai **${top[0]}** — ${formatINR(top[1])} udd gaye 😬\n• 14 din ka "no-${top[0].toLowerCase()}" challenge le, sirf 30% kam karega toh ${formatINR(saveTarget)} bach jayega.\n• ${subsTotal > 500 ? `Subscriptions pe ${formatINR(subsTotal)} ja rahe hain — jo this month open nahi kiya, usse cancel kar de, half jung jeet li.` : "Weekly cap laga, mahine ke end mein khud farak dikhega."}`;
    }
    if (id === "over") {
      if (foodThisWeek > 0 && foodThisWeek > foodLastWeek * 1.5 && foodLastWeek > 0) {
        const mult = (foodThisWeek / foodLastWeek).toFixed(1);
        return `Bhai, Zomato/Swiggy ka kharcha **${mult}x ho gaya** — is hafte ${formatINR(foodThisWeek)}, pichhle hafte sirf ${formatINR(foodLastWeek)} the 🍔\n\nThoda mess pe dhyan de — 3 mess meals = ${formatINR(450)} bach jayenge, easy.\n\nThumb rule: weekly food delivery ${formatINR(Math.round(foodLastWeek * 1.2))} ke andar rakh, fir invest karne ko bhi paise bachenge.`;
      }
      if (!top) return "Thode transactions add kar de, phir leak exactly dikhata hoon 🚰";
      const share = total ? Math.round((top[1] / total) * 100) : 0;
      return `Sabse zyada **${top[0]}** pe ja raha hai — ${formatINR(top[1])}, yaani total ka **${share}%**.${second ? `\n\nNumber 2 pe: ${second[0]} (${formatINR(second[1])}).` : ""}\n\nGolden rule: koi bhi ek non-essential category 25% se zyada nahi honi chahiye. ${share > 25 ? "Tu thoda upar hai — ek baar review kar le." : "Tu range mein hai — balance solid hai!"}`;
    }
    if (id === "invest") {
      return `Bhai, invest karne ka sahi time **abhi** hai — kal nahi 📈\n\n• **₹500 SIP** start kar — ek mutual fund mein, monthly auto-debit. 10 saal mein ye choti si aadat ${formatINR(115000)}+ ban sakti hai (12% return).\n• **Digital Gold** sirf ₹10 se shuru hota hai — chai chhod, gold le.\n• Pehle ek **emergency fund** bana — 3 mahine ke kharche jitna (~${formatINR(36000)}) — phir aage badh.\n\nGrow tab khol, calculator dekh — apni aankhon se compounding ka magic dikhega ✨`;
    }
    if (id === "5030") {
      return "Le bhai, **₹15,000/month** ka clean 50/30/20 split:\n\n• **₹7,500 — Needs (50%)**: rent, mess, transport, bills.\n• **₹4,500 — Wants (30%)**: Zomato, Netflix, shopping, weekend masti.\n• **₹3,000 — Savings (20%)**: pehle emergency fund (₹15k goal), phir SIP/FD.\n\nPro tip: 1st tarikh ko hi ₹3,000 savings mein auto-transfer laga de. Jo dikhta nahi, kharch nahi hota 💸";
    }
    return "Abhi sirf Quick Insights ka jawab de sakta hoon — full chat jaldi aa raha hai!";
  };

  const send = (id: string, label: string) => {
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: label };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: reply(id) }]);
    }, 1000);
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
        { id: `a-${Date.now()}`, role: "assistant", content: "Bhai, abhi ke liye Quick Insights tap kar — full free chat jaldi launch ho raha hai 🚀" },
      ]);
    }, 1000);
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
