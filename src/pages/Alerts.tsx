import { useActiveAlerts, useDismissAlert } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, Repeat, X } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Link } from "react-router-dom";
import type { ComputedAlert } from "@/lib/alerts";
import { useMemo } from "react";

const ICON: Record<ComputedAlert["kind"], any> = {
  subscription: Repeat,
  spike: TrendingUp,
  large: AlertTriangle,
};

export default function Alerts() {
  const alerts = useActiveAlerts();
  const dismiss = useDismissAlert();

  // Identify the most expensive anomaly to give it a red glow
  const topKey = useMemo(() => {
    if (!alerts.length) return null;
    return [...alerts].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0].key;
  }, [alerts]);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          {alerts.length} alert{alerts.length === 1 ? "" : "s"} from your recent activity.
        </p>
      </div>

      <ul className="space-y-3">
        {alerts.map((a) => {
          const Icon = ICON[a.kind];
          const tone = a.severity === "danger" ? "destructive" : "warning";
          const isTop = a.key === topKey;
          return (
            <li
              key={a.key}
              className={`surface-md rounded-2xl border p-4 flex items-start gap-3 animate-fade-in-up transition-all ${
                isTop
                  ? "border-destructive/40 shadow-[0_0_0_1px_hsl(var(--destructive)/0.25),0_10px_40px_-10px_hsl(var(--destructive)/0.45)]"
                  : "border-border"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${
                  tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{a.title}</h4>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                        a.severity === "danger"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {a.severity === "danger" ? "High" : "Medium"}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatDateTime(a.occurredAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                <div className="flex gap-2 mt-3">
                  {a.txId && (
                    <Link
                      to="/transactions"
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/70 transition-colors"
                    >
                      View transaction
                    </Link>
                  )}
                  <button
                    onClick={() => dismiss.mutate(a.key)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 -mr-1"
                onClick={() => dismiss.mutate(a.key)}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
