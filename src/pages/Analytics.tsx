import { useMemo, useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { formatINR } from "@/lib/format";
import { CATEGORY_COLORS } from "@/lib/categories";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Analytics() {
  const { data: txs = [] } = useTransactions();
  const [months, setMonths] = useState("6");

  const monthly = useMemo(() => {
    const n = parseInt(months);
    const arr: { month: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const sameMonth = (t: { occurred_at: string }) => {
        const td = new Date(t.occurred_at);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      };
      arr.push({
        month: label,
        income: txs.filter((t) => t.type === "income" && sameMonth(t)).reduce((s, t) => s + t.amount, 0),
        expense: txs.filter((t) => t.type === "expense" && sameMonth(t)).reduce((s, t) => s + t.amount, 0),
      });
    }
    return arr;
  }, [txs, months]);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    txs.filter((t) => t.type === "expense").forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + t.amount));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [txs]);

  const totalSpent = byCat.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Track patterns. Spot habits.</p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-32 h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 mo</SelectItem>
            <SelectItem value="6">Last 6 mo</SelectItem>
            <SelectItem value="12">Last 12 mo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="surface-md rounded-3xl p-5 border border-border">
        <h3 className="font-display font-semibold mb-1">Income vs Expense</h3>
        <p className="text-xs text-muted-foreground mb-4">Monthly comparison</p>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={monthly} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => formatINR(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top spender — calls out the ₹10,000 Party spike */}
      {byCat[0] && (
        <div className="surface-md rounded-3xl p-5 border border-destructive/25 bg-gradient-to-br from-destructive/5 to-transparent flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-2xl grid place-items-center shrink-0"
            style={{ background: `${CATEGORY_COLORS[byCat[0].name] ?? "hsl(var(--muted))"}25` }}
          >
            <span
              className="h-6 w-6 rounded-full"
              style={{ background: CATEGORY_COLORS[byCat[0].name] ?? "hsl(var(--muted-foreground))" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-destructive">Top spender</div>
            <p className="text-sm mt-1">
              Your biggest expense: <span className="font-semibold">{byCat[0].name}</span> ({formatINR(byCat[0].value)})
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="surface-md rounded-3xl p-5 border border-border">
          <h3 className="font-display font-semibold mb-1">Spending breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">All-time, by category</p>
          {byCat.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">No data</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={88} paddingAngle={2}>
                    {byCat.map((c) => <Cell key={c.name} fill={CATEGORY_COLORS[c.name] ?? "hsl(var(--muted-foreground))"} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface-md rounded-3xl p-5 border border-border">
          <h3 className="font-display font-semibold mb-1">Top categories</h3>
          <p className="text-xs text-muted-foreground mb-4">Where the money goes</p>
          {byCat.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">No data</div>
          ) : (
            <div className="space-y-3">
              {byCat.slice(0, 6).map((c) => {
                const pct = totalSpent ? (c.value / totalSpent) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{c.name}</span>
                      <span className="font-num text-muted-foreground">{formatINR(c.value)} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CATEGORY_COLORS[c.name] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
