import type { Transaction, NewTransaction } from "@/hooks/useTransactions";

/**
 * Returns the most recent transaction (within the last 24h) that has the
 * same amount and category as the candidate — used for the Duplicate Shield.
 */
export function findRecentDuplicate(
  candidate: Pick<NewTransaction, "amount" | "category" | "type">,
  existing: Transaction[]
): Transaction | null {
  if (!candidate.amount || !candidate.category) return null;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const cat = candidate.category.toLowerCase();
  const match = existing.find(
    (t) =>
      t.type === candidate.type &&
      t.category.toLowerCase() === cat &&
      Number(t.amount) === Number(candidate.amount) &&
      new Date(t.occurred_at).getTime() >= cutoff
  );
  return match ?? null;
}
