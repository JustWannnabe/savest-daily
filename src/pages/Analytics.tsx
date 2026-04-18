import { useMemo, useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { formatINR, formatDate } from "@/lib/format";
import { CATEGORY_COLORS } from "@/lib/categories";
import { Trophy, TrendingDown, BarChart3, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Range = "7" | "30" | "90";

export default function Analytics() {
  const { data: txs = [] } = useTransactions();
  const [range, setRange] = useState<Range>("30");

  // ---------- Spending Trend (smooth indigo area) ----------
  const trend = useMemo(() => {
    const days = parseInt(range);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const arr: { date: string; label: string; spent: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const spent = txs
        .filter((t) => t.type === "expense" && t.occurred_at.slice(0, 10) === key)
        .reduce((s, t) => s + t.amount, 0);
      arr.push({
        date: key,
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        spent,
      });
    }
    return arr;
  }, [txs, range]);

  // ---------- Category Breakdown (bar chart) ----------
  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    txs
      .filter((t) => t.type === "expense")
      .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [txs]);

  const totalSpent = byCat.reduce((s, c) => s + c.value, 0);
  const avgPerDay = trend.length ? trend.reduce((s, t) => s + t.spent, 0) / trend.length : 0;

  // ---------- Top 3 Spenders (single largest expense transactions) ----------
  const topSpenders = useMemo(
    () =>
      [...txs]
        .filter((t) => t.type === "expense")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3),
    [txs]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Deep Dive Analytics</h2>
          <p className="text-sm text-muted-foreground">Spot patterns. Track every rupee.</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-32 h-10 rounded-xl glass">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile
          icon={<TrendingDown className="h-4 w-4" />}
          label="Total spent"
          value={formatINR(totalSpent)}
          tone="destructive"
        />
        <StatTile
          icon={<Activity className="h-4 w-4" />}
          label={`Avg / day (${range}d)`}
          value={formatINR(Math.round(avgPerDay))}
          tone="accent"
        />
        <StatTile
          icon={<BarChart3 className="h-4 w-4" />}
          label="Active categories"
          value={String(byCat.length)}
          tone="muted"
        />
      </div>

      {/* Spending Trend AreaChart with indigo glow */}
      <div className="glass rounded-3xl p-5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[hsl(243_75%_59%/0.18)] blur-3xl pointer-events-none" />
        <div className="flex items-baseline justify-between mb-4 relative">
          <div>
            <h3 className="font-display font-semibold">Spending Trend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last {range} days · daily spend</p>
          </div>
        </div>
        <div className="h-72 relative">
          <ResponsiveContainer>
            <AreaChart data={trend} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="aIndigoFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(243 75% 59%)" stopOpacity={0.55} />
                  <stop offset="60%" stopColor="hsl(243 75% 59%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(243 75% 59%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aIndigoStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(243 80% 65%)" />
                  <stop offset="100%" stopColor="hsl(280 70% 65%)" />
                </linearGradient>
                <filter id="aGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(trend.length / 8))}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 10px 30px -10px hsl(243 75% 59% / 0.4)",
                }}
                formatter={(v: number) => [formatINR(v), "Spent"]}
              />
              <Area
                type="natural"
                dataKey="spent"
                stroke="url(#aIndigoStroke)"
                strokeWidth={2.5}
                fill="url(#aIndigoFill)"
                style={{ filter: "url(#aGlow)" }}
                dot={{ r: 2.5, fill: "hsl(243 75% 65%)", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "hsl(243 75% 65%)", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown — BarChart */}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold">Category Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All-time spend, per category</p>
          </div>
        </div>
        {byCat.length === 0 ? (
          <div className="h-52 grid place-items-center text-sm text-muted-foreground">
            No expenses yet
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={byCat} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatINR(v)}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {byCat.map((c) => (
                    <Cell
                      key={c.name}
                      fill={CATEGORY_COLORS[c.name] ?? "hsl(var(--muted-foreground))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top 3 Spenders list */}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <h3 className="font-display font-semibold">Top Spenders</h3>
          </div>
          <p className="text-xs text-muted-foreground">Biggest single transactions</p>
        </div>

        {topSpenders.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No expenses yet</div>
        ) : (
          <ol className="space-y-3">
            {topSpenders.map((t, i) => {
              const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"]; // gold, silver, bronze
              const color = CATEGORY_COLORS[t.category] ?? "hsl(var(--muted-foreground))";
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors"
                >
                  <div
                    className="h-9 w-9 rounded-full grid place-items-center font-display font-bold text-sm shrink-0 text-background"
                    style={{ background: rankColors[i] }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                    style={{ background: `${color}25` }}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {t.merchant ?? t.category}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.category} · {formatDate(t.occurred_at)}
                    </div>
                  </div>
                  <div className="font-num font-bold text-sm shrink-0">
                    {formatINR(t.amount)}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Category leaderboard with progress bars */}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display font-semibold">Where the money goes</h3>
          <p className="text-xs text-muted-foreground">Share of total spend</p>
        </div>
        {byCat.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No data</div>
        ) : (
          <div className="space-y-3">
            {byCat.slice(0, 8).map((c) => {
              const pct = totalSpent ? (c.value / totalSpent) * 100 : 0;
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium">{c.name}</span>
                    <span className="font-num text-muted-foreground text-xs">
                      {formatINR(c.value)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: CATEGORY_COLORS[c.name] ?? "hsl(var(--muted-foreground))",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "accent" | "destructive" | "muted";
}) {
  const toneClasses: Record<typeof tone, string> = {
    accent: "text-accent bg-accent/10",
    destructive: "text-destructive bg-destructive/10",
    muted: "text-muted-foreground bg-muted/40",
  };
  return (
    <div className="glass rounded-2xl p-4">
      <div className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${toneClasses[tone]}`}>
        {icon}
        {label}
      </div>
      <div className="font-display font-bold text-xl font-num mt-2">{value}</div>
    </div>
  );
}
