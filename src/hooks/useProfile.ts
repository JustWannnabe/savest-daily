import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "./useTransactions";
import { useMemo } from "react";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  currency: string;
  streak_count: number;
  last_active_date: string | null;
};

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/**
 * Streak = number of consecutive past days (ending today or yesterday)
 * where the user logged at least one expense AND total expense for that
 * day was below their average daily expense (i.e. a "saving" day).
 */
export function useSavingsStreak() {
  const { data: txs = [] } = useTransactions();
  return useMemo(() => {
    if (!txs.length) return 0;
    const expenses = txs.filter((t) => t.type === "expense");
    if (!expenses.length) return 0;

    const byDay = new Map<string, number>();
    for (const t of expenses) {
      const d = new Date(t.occurred_at);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + t.amount);
    }
    const avg = [...byDay.values()].reduce((a, b) => a + b, 0) / byDay.size;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // start from today; if today has no entry, start from yesterday
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const spent = byDay.get(key);
      if (spent === undefined) {
        if (i === 0) continue; // grace day
        break;
      }
      if (spent <= avg) streak++;
      else break;
    }
    return streak;
  }, [txs]);
}
