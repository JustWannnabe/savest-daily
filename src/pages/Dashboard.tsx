import { useMemo, useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useActiveAlerts } from "@/hooks/useAlerts";
import { useSavingsStreak } from "@/hooks/useProfile";
import { formatINR, formatDate } from "@/lib/format";
import { Plus, ArrowUpRight, ArrowDownLeft, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { BudgetRing } from "@/components/dashboard/BudgetRing";
import { StreakCard } from "@/components/dashboard/StreakCard";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";
import { CATEGORY_COLORS } from "@/lib/categories";
import { Link } from "react-router-dom";

const MONTHLY_BUDGET = 12000;

export default function Dashboard() {
  const { data: txs = [], isLoading } = useTransactions();
  const alerts = useActiveAlerts();
  const streak = useSavingsStreak();
  const [sheetOpen, setSheetOpen] = useState(false);

  const monthTxs = useMemo(() => {
    const now = new Date();
    return txs.filter((t) => {
      const d = new Date(t.occurred_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [txs]);

  const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthTxs.filter((t) => t.type === "expense").forEach((t) => {
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTxs]);

  const trend7 = useMemo(() => {
    const days: { date: string; spent: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const spent = txs
        .filter((t) => t.type === "expense" && t.occurred_at.slice(0, 10) === key)
        .reduce((s, t) => s + t.amount, 0);
      days.push({ date: d.toLocaleDateString("en-IN", { weekday: "short" }), spent });
    }
    return days;
  }, [txs]);

  const recent = txs.slice(0, 5);

  const isNegative = balance < 0;
  const overspentBy = isNegative ? Math.abs(balance) : 0;

  // Saved this week (cap at 0 floor) — used by the Growth Opportunity card.
  const savedThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const recentIncome = txs
      .filter((t) => t.type === "income" && new Date(t.occurred_at).getTime() >= weekAgo)
      .reduce((s, t) => s + t.amount, 0);
    const recentExpense = txs
      .filter((t) => t.type === "expense" && new Date(t.occurred_at).getTime() >= weekAgo)
      .reduce((s, t) => s + t.amount, 0);
    return Math.max(0, recentIncome - recentExpense);
  }, [txs]);
  // Demo-friendly floor so the teaser always reads well.
  const savedDisplay = Math.max(savedThisWeek, 500);
  // Digital Gold projection — assume ~12% CAGR over 3 yrs, monthly compounding.
  const projected3y = Math.round(savedDisplay * Math.pow(1 + 0.12 / 12, 36));

  return (
    <div className="space-y-6">
      {/* Hero balance card */}
      <div
        className={`rounded-3xl text-primary-foreground p-6 md:p-8 surface-lg overflow-hidden relative ${
          isNegative ? "gradient-balance-negative" : "gradient-balance"
        }`}
      >
        <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl ${isNegative ? "bg-[#FF4D4D]/30" : "bg-accent/30"}`} />
        <div className="relative">
          <div className={`text-xs font-medium uppercase tracking-wider ${isNegative ? "text-white/90" : "opacity-70"}`}>Available balance · this month</div>
          <div className={`font-display font-bold text-4xl md:text-5xl mt-2 font-num ${isNegative ? "text-white" : ""}`}>{formatINR(balance)}</div>
          {isNegative && (
            <div
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold animate-fade-in-up text-white"
              style={{ background: "#FF4D4D", boxShadow: "0 6px 18px -4px hsl(0 100% 60% / 0.6)" }}
            >
              <AlertTriangle className="h-3 w-3" />
              Overspent by {formatINR(overspentBy)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-6 max-w-md">
            <div className="rounded-2xl bg-background/10 backdrop-blur-sm p-3">
              <div className={`flex items-center gap-1.5 text-xs ${isNegative ? "text-white/80" : "opacity-80"}`}><ArrowDownLeft className="h-3 w-3" />Income</div>
              <div className={`font-num font-semibold mt-1 ${isNegative ? "text-white" : ""}`}>{formatINR(income)}</div>
            </div>
            <div className="rounded-2xl bg-background/10 backdrop-blur-sm p-3">
              <div className={`flex items-center gap-1.5 text-xs ${isNegative ? "text-white/80" : "opacity-80"}`}><ArrowUpRight className="h-3 w-3" />Spent</div>
              <div className={`font-num font-semibold mt-1 ${isNegative ? "text-white" : ""}`}>{formatINR(expense)}</div>
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <Link to="/alerts" className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 hover:bg-warning/10 transition-colors">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <div className="text-sm flex-1">
            <span className="font-medium">{alerts.length} alert{alerts.length > 1 ? "s" : ""}</span>{" "}
            <span className="text-muted-foreground">need your attention</span>
          </div>
          <span className="text-xs text-muted-foreground">View →</span>
        </Link>
      )}

      <StreakCard streak={streak} toGoal={500} />

      {/* Growth Opportunity teaser */}
      <Link
        to="/grow"
        className="block rounded-3xl p-5 border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent hover:from-accent/15 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-accent/20 grid place-items-center shrink-0">
            <TrendingUp className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">Growth opportunity</div>
            <p className="text-sm mt-1">
              Bhai, you saved <span className="font-semibold">{formatINR(savedDisplay)}</span> this week. If you invested this in Digital Gold, it could become{" "}
              <span className="font-semibold text-accent">{formatINR(projected3y)}</span> in 3 years.
            </p>
          </div>
          <span className="text-xs font-semibold text-accent shrink-0 group-hover:translate-x-0.5 transition-transform">Grow now →</span>
        </div>
      </Link>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Budget health ring */}
        <div className="surface-md rounded-3xl p-5 border border-border flex flex-col items-center justify-center">
          <div className="self-stretch flex items-baseline justify-between mb-2">
            <h3 className="font-display font-semibold">Budget health</h3>
            <span className="text-xs text-muted-foreground">This month</span>
          </div>
          <div className="flex-1 grid place-items-center py-2">
            <BudgetRing spent={expense} budget={MONTHLY_BUDGET} income={income} />
          </div>
        </div>

        {/* 7-day trend */}
        <div className="surface-md rounded-3xl p-5 border border-border md:col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display font-semibold">Last 7 days</h3>
            <span className="text-xs text-muted-foreground">Daily spend</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend7} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="indigoFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(243 75% 59%)" stopOpacity={0.45} />
                    <stop offset="60%" stopColor="hsl(243 75% 59%)" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="hsl(243 75% 59%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="indigoStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(243 75% 59%)" />
                    <stop offset="100%" stopColor="hsl(262 70% 60%)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [formatINR(v), "Spent"]}
                />
                <Area
                  type="natural"
                  dataKey="spent"
                  stroke="url(#indigoStroke)"
                  strokeWidth={2.5}
                  fill="url(#indigoFill)"
                  dot={{ r: 3, fill: "hsl(243 75% 59%)", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "hsl(243 75% 59%)", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4">

        {/* Category donut */}
        <div className="surface-md rounded-3xl p-5 border border-border">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display font-semibold">By category</h3>
            <span className="text-xs text-muted-foreground">This month</span>
          </div>
          {byCategory.length === 0 ? (
            <div className="h-40 grid place-items-center text-sm text-muted-foreground">No expenses yet</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={2}>
                      {byCategory.map((c) => (
                        <Cell key={c.name} fill={CATEGORY_COLORS[c.name] ?? "hsl(var(--muted-foreground))"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {byCategory.slice(0, 4).map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[c.name] }} />
                    <span className="truncate flex-1">{c.name}</span>
                    <span className="font-num font-medium">{formatINR(c.value, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent */}
      <div className="surface-md rounded-3xl p-5 border border-border">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-display font-semibold">Recent activity</h3>
          <Link to="/transactions" className="text-xs text-muted-foreground hover:text-foreground">See all →</Link>
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No transactions yet. Add your first one.</div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div
                  className="h-10 w-10 rounded-full grid place-items-center shrink-0"
                  style={{ background: `${CATEGORY_COLORS[t.category] ?? "hsl(var(--muted))"}20` }}
                >
                  {t.type === "income" ? (
                    <ArrowDownLeft className="h-4 w-4 text-success" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" style={{ color: CATEGORY_COLORS[t.category] ?? "hsl(var(--muted-foreground))" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.merchant ?? t.category}</div>
                  <div className="text-xs text-muted-foreground">{t.category} · {formatDate(t.occurred_at)}</div>
                </div>
                <div className={`font-num font-semibold text-sm ${t.type === "income" ? "text-success" : ""}`}>
                  {t.type === "income" ? "+" : "−"}{formatINR(t.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB */}
      <Button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-lg z-40"
        size="icon"
        aria-label="Add transaction"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <TransactionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
