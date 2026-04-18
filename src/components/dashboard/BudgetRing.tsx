import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

type Props = {
  spent: number;
  budget: number;
  income?: number; // when provided, drives "over budget" tone (spent > income → red)
  size?: number;
};

export function BudgetRing({ spent, budget, income, size = 140 }: Props) {
  const pct = Math.min(100, budget > 0 ? (spent / budget) * 100 : 0);
  const [animPct, setAnimPct] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (animPct / 100) * c;

  // Required logic:
  //   spent > income  → Red / Over budget
  //   spent > 80% of budget → Amber
  //   else → Green
  const overIncome = typeof income === "number" && income > 0 && spent > income;
  const tone = overIncome
    ? "hsl(var(--destructive))"
    : pct > 80
    ? "hsl(var(--warning))"
    : "hsl(var(--success))";
  const status = overIncome ? "Over budget" : pct > 80 ? "Watch it" : "On track";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display font-bold text-2xl font-num leading-none">{Math.round(pct)}%</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5">{status}</div>
          <div className="text-[10px] text-muted-foreground font-num mt-0.5">
            {formatINR(spent, { compact: true })} / {formatINR(budget, { compact: true })}
          </div>
        </div>
      </div>
    </div>
  );
}
