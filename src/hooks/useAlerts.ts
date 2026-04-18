import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "./useTransactions";
import { computeAlerts } from "@/lib/alerts";
import { useMemo } from "react";

export function useDismissals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dismissals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("alert_dismissals").select("alert_key");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.alert_key as string));
    },
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (alert_key: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("alert_dismissals")
        .insert({ alert_key, user_id: user.id });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dismissals"] }),
  });
}

export function useActiveAlerts() {
  const { data: txs = [] } = useTransactions();
  const { data: dismissed } = useDismissals();
  return useMemo(() => {
    const all = computeAlerts(txs);
    if (!dismissed) return all;
    return all.filter((a) => !dismissed.has(a.key));
  }, [txs, dismissed]);
}
