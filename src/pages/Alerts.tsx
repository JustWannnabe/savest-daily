import { useActiveAlerts, useDismissAlert } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, Repeat, X, BellOff } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Link } from "react-router-dom";
import type { ComputedAlert } from "@/lib/alerts";

const ICON: Record<ComputedAlert["kind"], any> = {
  subscription: Repeat,
  spike: TrendingUp,
  large: AlertTriangle,
};

export default function Alerts() {
  const alerts = useActiveAlerts();
  const dismiss = useDismissAlert();

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          {alerts.length === 0
            ? "All clear — no anomalies in your spending."
            : `${alerts.length} alert${alerts.length > 1 ? "s" : ""} from your recent activity.`}
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="surface-md rounded-3xl p-10 border border-border text-center">
          <div className="h-12 w-12 rounded-full bg-success/10 grid place-items-center mx-auto">
            <BellOff className="h-5 w-5 text-success" />
          </div>
          <h3 className="font-display font-semibold mt-4">You're in the clear</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            We watch for subscription price hikes, spending spikes (&gt; 2× your weekly average), and unusually large charges.
          </p>
          <Link to="/transactions" className="inline-block mt-4 text-sm font-medium text-accent hover:underline">
            Add more transactions to enable detection →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => {
            const Icon = ICON[a.kind];
            const tone = a.severity === "danger" ? "destructive" : "warning";
            return (
              <li
                key={a.key}
                className="surface-md rounded-2xl border border-border p-4 flex items-start gap-3 animate-fade-in-up"
              >
                <div
                  className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${
                    tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold">{a.title}</h4>
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatDateTime(a.occurredAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
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
      )}
    </div>
  );
}
