import { useEffect, useState } from "react";

const KEY = "moneyflow.monthlyBudget";
const DEFAULT_BUDGET = 60000;

/** User-defined monthly budget, persisted to localStorage. */
export function useMonthlyBudget() {
  const [budget, setBudgetState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_BUDGET;
    const raw = window.localStorage.getItem(KEY);
    const n = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_BUDGET;
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        const n = parseFloat(e.newValue);
        if (Number.isFinite(n) && n > 0) setBudgetState(n);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setBudget = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return;
    window.localStorage.setItem(KEY, String(n));
    setBudgetState(n);
  };

  /** Suggest = 60% of total earning. */
  const suggestFrom = (earning: number) => {
    const sug = Math.max(1000, Math.round((earning * 0.6) / 100) * 100);
    setBudget(sug);
    return sug;
  };

  return { budget, setBudget, suggestFrom };
}
