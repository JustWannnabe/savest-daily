import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactions } from "@/hooks/useTransactions";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; id: string };

const QUICK = [
  { id: "where", label: "Bhai, mera paisa kahan ja raha hai?" },
  { id: "food", label: "Zomato/Swiggy pe total kitna uda diya maine?" },
  { id: "500", label: "Mere paas ₹500 bach rahe hain, kahan lagau?" },
  { id: "sip", label: "SIP shuru karne ka sahi time kya hai?" },
];

export default function Mentor() {
  const { data: txs = [] } = useTransactions();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "hi",
      role: "assistant",
      content:
        "Arre wah, aa gaya tu! 👋 Main tera MoneyFlow mentor — paise bachane se lekar invest karne tak, sab samjhaunga. Niche koi quick insight tap kar, ya kuch bhi pooch — main hoon na!",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build a compact context summary for the AI
  const context = useMemo(() => {
    if (!txs.length) return "No transactions yet.";
    const expenses = txs.filter((t) => t.type === "expense");
    const income = txs.filter((t) => t.type === "income");
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
    const totalInc = income.reduce((s, t) => s + t.amount, 0);
    const balance = totalInc - totalExp;

    const byCat = new Map<string, number>();
    expenses.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount));
    const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const subs = expenses.filter((t) => t.is_subscription);
    const subsTotal = subs.reduce((s, t) => s + t.amount, 0);

    const food = expenses.filter((t) => {
      const m = (t.merchant ?? "").toLowerCase();
      const c = t.category.toLowerCase();
      return /zomato|swiggy|canteen/.test(m) || /food/.test(c);
    });
    const foodTotal = food.reduce((s, t) => s + t.amount, 0);

    return `- Total income: ₹${totalInc.toLocaleString("en-IN")}
- Total expenses: ₹${totalExp.toLocaleString("en-IN")}
- Available balance: ₹${balance.toLocaleString("en-IN")}${balance < 0 ? " (OVERSPENT!)" : ""}
- Top categories: ${topCats.map(([c, a]) => `${c} (₹${a.toLocaleString("en-IN")})`).join(", ")}
- Food/delivery total: ₹${foodTotal.toLocaleString("en-IN")}
- Subscriptions total: ₹${subsTotal.toLocaleString("en-IN")} across ${subs.length} services
- Total transactions: ${txs.length}`;
  }, [txs]);

  // Hardcoded quick-insight replies
  const quickReply = (id: string): string => {
    const expenses = txs.filter((t) => t.type === "expense");
    const income = txs.filter((t) => t.type === "income");
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
    const totalInc = income.reduce((s, t) => s + t.amount, 0);
    const balance = totalInc - totalExp;

    if (id === "where") {
      const byCat = new Map<string, number>();
      expenses.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount));
      const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
      const c1 = sorted[0]?.[0] ?? "Food";
      const c2 = sorted[1]?.[0] ?? "Shopping";
      const a1 = sorted[0]?.[1] ?? 0;
      const a2 = sorted[1]?.[1] ?? 0;
      return `Bhai, tera sabse zyada paisa **${c1}** (${formatINR(a1)}) aur **${c2}** (${formatINR(a2)}) mein ja raha hai. Thoda sambhal ke! 👀`;
    }

    if (id === "food") {
      const food = expenses.filter((t) => {
        const m = (t.merchant ?? "").toLowerCase();
        const c = t.category.toLowerCase();
        return /zomato|swiggy|canteen/.test(m) || /food/.test(c);
      });
      const total = food.reduce((s, t) => s + t.amount, 0);
      return `Bhai, tune khane-peene pe total **${formatINR(total)}** kharch kiye hain. Itna bahar ka khana sahi nahi hai, health aur pocket dono ke liye! 🍔`;
    }

    if (id === "500") {
      return `₹500 hain toh best hai! **₹200 ka Digital Gold** le le aur **₹300 kisi saste certification course** mein laga. Invest in yourself, bhai! 💪`;
    }

    if (id === "sip") {
      return `Best time toh kal tha, second best time **AAJ** hai! Choti amount se shuru kar, compounding ka jaadu dekhna phir. **'Grow' page** check kar! 📈`;
    }

    // Witty fallback referencing balance
    if (balance < 0) {
      return `Bhai, tera balance **${formatINR(balance)}** hai. Pehle kharcha control kar, phir baaki sab! 😅`;
    }
    return "Niche koi quick insight tap kar, ya apna sawaal type kar — main hoon na!";
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendQuick = (id: string, label: string) => {
    if (streaming) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: label };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: quickReply(id) }]);
    }, 1000);
  };

  const sendFree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setTyping(true);
    setStreaming(true);

    try {
      // 1-second typing delay before stream starts
      await new Promise((r) => setTimeout(r, 1000));

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mentor-chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          context,
          messages: history
            .filter((m) => m.id !== "hi")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error("Thoda ruk ke try kar bhai — rate limit hit!");
        } else if (resp.status === 402) {
          toast.error("AI credits khatam — workspace mein top up kar.");
        } else {
          toast.error("AI ko kuch problem hui, dobara try kar.");
        }
        setTyping(false);
        setStreaming(false);
        return;
      }

      setTyping(false);
      const aId = `a-${Date.now()}`;
      setMessages((m) => [...m, { id: aId, role: "assistant", content: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let acc = "";

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              setMessages((m) =>
                m.map((msg) => (msg.id === aId ? { ...msg, content: acc } : msg)),
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection issue, dobara try kar bhai!");
      setTyping(false);
    } finally {
      setStreaming(false);
      setTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-9rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {typing && (
          <div className="flex items-end gap-2">
            <AiAvatar />
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
              onClick={() => sendQuick(q.id, q.label)}
              disabled={streaming}
              className="text-xs md:text-sm font-medium px-3 py-1.5 rounded-full bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors border border-border disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
        <form onSubmit={sendFree} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Kuch bhi pooch — paisa, party, plans…"
            className="rounded-xl h-11"
            disabled={streaming}
          />
          <Button type="submit" size="icon" className="h-11 w-11 rounded-xl shrink-0" disabled={streaming || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

const AiAvatar = () => (
  <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-accent to-accent/60 grid place-items-center">
    <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
  </div>
);

const UserAvatar = () => (
  <div className="h-7 w-7 shrink-0 rounded-full bg-foreground grid place-items-center">
    <UserIcon className="h-3.5 w-3.5 text-background" />
  </div>
);

const Bubble = ({ msg }: { msg: Msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 animate-fade-in-up ${isUser ? "justify-end" : ""}`}>
      {!isUser && <AiAvatar />}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-foreground text-background rounded-br-sm"
            : "bg-secondary text-foreground rounded-bl-sm"
        }`}
      >
        {formatBold(msg.content)}
      </div>
      {isUser && <UserAvatar />}
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
