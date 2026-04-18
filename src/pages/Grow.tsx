import { useMemo, useState } from "react";
import { Coins, LineChart as LineIcon, GraduationCap, ShieldCheck, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatINR } from "@/lib/format";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const CARDS = [
  {
    key: "gold",
    title: "Digital Gold",
    tagline: "Start with just ₹10",
    body: "Buy 24K gold by the gram, no locker needed. Liquid, safe, and a solid hedge against inflation.",
    icon: Coins,
    accent: "hsl(38 92% 55%)",
    cta: "Start with ₹10",
  },
  {
    key: "sip",
    title: "Mutual Funds SIP",
    tagline: "Wealth over time",
    body: "Auto-invest a fixed amount every month. Power of compounding does the heavy lifting.",
    icon: LineIcon,
    accent: "hsl(243 75% 59%)",
    cta: "Plan a SIP",
  },
  {
    key: "skill",
    title: "Skill-Building",
    tagline: "Invest in yourself",
    body: "Online courses, certifications, side-project gear. Highest ROI asset class — your own brain.",
    icon: GraduationCap,
    accent: "hsl(173 80% 40%)",
    cta: "Browse courses",
  },
  {
    key: "ef",
    title: "Emergency Fund",
    tagline: "3 months of safety",
    body: "Park 3× your monthly expenses in a high-yield account. Sleep better, decide bolder.",
    icon: ShieldCheck,
    accent: "hsl(158 64% 42%)",
    cta: "Set a goal",
  },
];

// Compounding: A = P × ((1+r)^n − 1) / r × (1+r)
// monthly contribution `m`, monthly rate `r = annual/12`, periods n = years*12
function projectSIP(monthly: number, years: number, annualPct = 12) {
  const r = annualPct / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return Math.round((monthly * (Math.pow(1 + r, n) - 1) * (1 + r)) / r);
}

export default function Grow() {
  const [monthly, setMonthly] = useState(1000);
  const [years, setYears] = useState(5);

  const future = projectSIP(monthly, years);
  const invested = monthly * years * 12;
  const gains = future - invested;

  const series = useMemo(() => {
    const arr: { year: string; value: number; invested: number }[] = [];
    for (let y = 1; y <= years; y++) {
      arr.push({
        year: `Y${y}`,
        value: projectSIP(monthly, y),
        invested: monthly * y * 12,
      });
    }
    return arr;
  }, [monthly, years]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          MoneyFlow Multiplier — chhote-chhote saving habits, badi grow stories.
        </p>
      </div>

      {/* Investment cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              className="surface-md rounded-3xl p-5 border border-border hover:-translate-y-0.5 hover:shadow-lg transition-all group relative overflow-hidden"
            >
              <div
                className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"
                style={{ background: c.accent }}
              />
              <div className="relative">
                <div
                  className="h-12 w-12 rounded-2xl grid place-items-center mb-3"
                  style={{ background: `${c.accent}20`, color: c.accent }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-semibold text-lg">{c.title}</h3>
                <p className="text-xs font-medium uppercase tracking-wider mt-0.5" style={{ color: c.accent }}>
                  {c.tagline}
                </p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.body}</p>
                <button
                  className="mt-4 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: `${c.accent}18`, color: c.accent }}
                >
                  {c.cta} →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compounding calculator */}
      <div className="surface-md rounded-3xl p-5 md:p-6 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h3 className="font-display font-semibold">Compounding calculator</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Slide karke dekh — chhoti SIP bhi waqt ke saath badi ho jaati hai. (12% annual return assumed)
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sliders */}
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm font-medium">Monthly investment</label>
                <span className="font-num font-semibold text-sm">{formatINR(monthly)}</span>
              </div>
              <Slider
                value={[monthly]}
                onValueChange={(v) => setMonthly(v[0])}
                min={100}
                max={20000}
                step={100}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-num">
                <span>₹100</span>
                <span>₹20,000</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm font-medium">Years</label>
                <span className="font-num font-semibold text-sm">{years} yr{years > 1 ? "s" : ""}</span>
              </div>
              <Slider
                value={[years]}
                onValueChange={(v) => setYears(v[0])}
                min={1}
                max={30}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-num">
                <span>1 yr</span>
                <span>30 yrs</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Stat label="Invested" value={invested} muted />
              <Stat label="Gains" value={gains} accent />
              <Stat label="Total" value={future} bold />
            </div>
          </div>

          {/* Chart */}
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Potential growth</div>
            <div className="font-display font-bold text-3xl font-num text-accent">{formatINR(future)}</div>
            <p className="text-xs text-muted-foreground mb-3">
              from {formatINR(monthly)}/mo × {years} years
            </p>
            <div className="h-44">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ top: 5, right: 8, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="growFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number, n) => [formatINR(v), n === "value" ? "Total" : "Invested"]}
                  />
                  <Area type="natural" dataKey="invested" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="transparent" strokeDasharray="4 4" />
                  <Area type="natural" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#growFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Stat = ({ label, value, muted, accent, bold }: { label: string; value: number; muted?: boolean; accent?: boolean; bold?: boolean }) => (
  <div className="rounded-2xl bg-secondary/60 border border-border p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div
      className={`font-num mt-1 ${bold ? "font-bold text-base" : "font-semibold text-sm"} ${
        accent ? "text-accent" : muted ? "text-muted-foreground" : ""
      }`}
    >
      {formatINR(value, { compact: true })}
    </div>
  </div>
);
