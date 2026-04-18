import type { Transaction } from "@/hooks/useTransactions";

export type AlertSeverity = "warn" | "danger";
export type AlertKind = "subscription" | "spike" | "large";

export type ComputedAlert = {
  key: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  message: string;
  occurredAt: string;
  txId?: string;
};

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
};

export function computeAlerts(txs: Transaction[]): ComputedAlert[] {
  const alerts: ComputedAlert[] = [];
  if (!txs.length) return alerts;

  // 1. Subscription price jumps
  const subs = txs.filter((t) => t.is_subscription || t.category === "Subscriptions");
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of subs) {
    const m = (t.merchant || t.note || "Unknown").trim();
    if (!m) continue;
    const arr = byMerchant.get(m) ?? [];
    arr.push(t);
    byMerchant.set(m, arr);
  }
  for (const [merchant, list] of byMerchant) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (prev.amount > 0 && last.amount > prev.amount * 1.1) {
      const pct = Math.round(((last.amount - prev.amount) / prev.amount) * 100);
      alerts.push({
        key: `sub:${merchant}:${last.id}`,
        kind: "subscription",
        severity: "warn",
        title: "Subscription price increase",
        message: `${merchant} went from ₹${prev.amount.toLocaleString("en-IN")} → ₹${last.amount.toLocaleString("en-IN")} (+${pct}%)`,
        occurredAt: last.occurred_at,
        txId: last.id,
      });
    }
  }

  // 2. Weekly spending spikes per category (this week vs trailing 4-week avg)
  const expenses = txs.filter((t) => t.type === "expense");
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const weekBuckets: Record<string, number[]> = {}; // category → [thisWeek, w-1, w-2, w-3, w-4]
  for (const t of expenses) {
    const d = new Date(t.occurred_at);
    const diffWeeks = Math.floor((thisWeekStart.getTime() - startOfWeek(d).getTime()) / (7 * 86400000));
    if (diffWeeks < 0 || diffWeeks > 4) continue;
    if (!weekBuckets[t.category]) weekBuckets[t.category] = [0, 0, 0, 0, 0];
    weekBuckets[t.category][diffWeeks] += t.amount;
  }
  for (const [cat, buckets] of Object.entries(weekBuckets)) {
    const thisWeek = buckets[0];
    const past = buckets.slice(1).filter((v) => v > 0);
    if (!past.length || thisWeek < 500) continue;
    const avg = past.reduce((a, b) => a + b, 0) / past.length;
    if (thisWeek > avg * 2) {
      const mult = (thisWeek / avg).toFixed(1);
      alerts.push({
        key: `spike:${cat}:${thisWeekStart.toISOString().slice(0, 10)}`,
        kind: "spike",
        severity: "danger",
        title: `Spending spike in ${cat}`,
        message: `You've spent ₹${Math.round(thisWeek).toLocaleString("en-IN")} this week — ${mult}× your usual.`,
        occurredAt: now.toISOString(),
      });
    }
  }

  // 3. Unusually large single charge (> 3× avg expense)
  if (expenses.length >= 5) {
    const avg = expenses.reduce((a, b) => a + b.amount, 0) / expenses.length;
    const recent = expenses.slice(0, 30);
    for (const t of recent) {
      if (t.amount > avg * 3 && t.amount >= 1000) {
        alerts.push({
          key: `large:${t.id}`,
          kind: "large",
          severity: "warn",
          title: "Unusual large charge",
          message: `${t.merchant || t.category} — ₹${t.amount.toLocaleString("en-IN")} is ${(t.amount / avg).toFixed(1)}× your average.`,
          occurredAt: t.occurred_at,
          txId: t.id,
        });
      }
    }
  }

  // newest first
  return alerts.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
