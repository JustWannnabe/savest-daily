import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

type Props = {
  spent: number;
  budget: number;
  size?: number;
};

/**
 * Budget Health ring.
 *  - spent > budget  → CRITICAL (red, pulsing glow)
 *  - spent > 80% budget → Watch it (amber)
 *  - else → Good Progress (teal/green)
 */
export function BudgetRing({ spent, budget, size = 140 }: Props) {
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

  const isCritical = budget > 0 && spent > budget;
  const isWarn = !isCritical && pct > 80;

  const tone = isCritical
    ? "#FF4D4D"
    : isWarn
    ? "hsl(var(--warning))"
    : "hsl(var(--success))";
  const status = isCritical ? "CRITICAL" : isWarn ? "Watch it" : "Good Progress";
  const statusClass = isCritical
    ? "text-[#FF4D4D] font-bold animate-pulse"
    : "text-muted-foreground";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className={`-rotate-90 ${isCritical ? "ring-glow-danger" : ""}`}
      >
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--secondary))" strokeWidth={stroke} fill="none" />
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
          <div className={`text-[10px] uppercase tracking-wider mt-1.5 ${statusClass}`}>{status}</div>
          <div className="text-[10px] text-muted-foreground font-num mt-0.5">
            {formatINR(spent, { compact: true })} / {formatINR(budget, { compact: true })}
          </div>
        </div>
      </div>
    </div>
  );
}
