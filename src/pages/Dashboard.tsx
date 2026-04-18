import { useMemo, useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useActiveAlerts } from "@/hooks/useAlerts";
import { formatINR, formatDate } from "@/lib/format";
import { Plus, ArrowUpRight, ArrowDownLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
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

export default function Dashboard() {
  const { data: txs = [], isLoading } = useTransactions();
  const alerts = useActiveAlerts();
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

  return (
    <div className="space-y-6">
      {/* Hero balance card */}
      <div className="rounded-3xl gradient-balance text-primary-foreground p-6 md:p-8 surface-lg overflow-hidden relative">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative">
          <div className="text-xs font-medium uppercase tracking-wider opacity-70">Available balance · this month</div>
          <div className="font-display font-bold text-4xl md:text-5xl mt-2 font-num">{formatINR(balance)}</div>
          <div className="grid grid-cols-2 gap-3 mt-6 max-w-md">
            <div className="rounded-2xl bg-background/10 backdrop-blur-sm p-3">
              <div className="flex items-center gap-1.5 text-xs opacity-80"><ArrowDownLeft className="h-3 w-3" />Income</div>
              <div className="font-num font-semibold mt-1">{formatINR(income)}</div>
            </div>
            <div className="rounded-2xl bg-background/10 backdrop-blur-sm p-3">
              <div className="flex items-center gap-1.5 text-xs opacity-80"><ArrowUpRight className="h-3 w-3" />Spent</div>
              <div className="font-num font-semibold mt-1">{formatINR(expense)}</div>
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

      <div className="grid md:grid-cols-2 gap-4">
        {/* 7-day trend */}
        <div className="surface-md rounded-3xl p-5 border border-border">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display font-semibold">Last 7 days</h3>
            <span className="text-xs text-muted-foreground">Daily spend</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend7} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [formatINR(v), "Spent"]}
                />
                <Area type="monotone" dataKey="spent" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

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
