import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions, type NewTransaction } from "./useTransactions";

/**
 * One-time auto-seed for new users so the demo has life from second one.
 * Engineered to trigger:
 *  - Subscription jump alert (Netflix ₹199 → ₹649)
 *  - Spending spike alert (Food & Drink this week 3× last week)
 *  - Unusual large charge (Bookstore ₹4,200)
 */
export function useSeedData() {
  const { user } = useAuth();
  const { data: txs, isLoading } = useTransactions();
  const qc = useQueryClient();
  const seeded = useRef(false);

  useEffect(() => {
    if (!user || isLoading || seeded.current) return;
    if (!txs || txs.length > 0) return;
    seeded.current = true;

    const today = new Date();
    const day = (offset: number, hour = 13) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      return d.toISOString();
    };

    const seed: NewTransaction[] = [
      // ── Income ─────────────────────────────────────────────
      { amount: 8000, type: "income", category: "Income", merchant: "Pocket Money", note: "Monthly from parents", occurred_at: day(28, 10), is_subscription: false },
      { amount: 2500, type: "income", category: "Income", merchant: "Tutoring", note: "Weekend coaching", occurred_at: day(12, 11), is_subscription: false },

      // ── Food & Drink (last week — small) ───────────────────
      { amount: 180, type: "expense", category: "Food & Drink", merchant: "College Canteen", note: "Lunch", occurred_at: day(10), is_subscription: false },
      { amount: 240, type: "expense", category: "Food & Drink", merchant: "Zomato", note: "Maggi cravings", occurred_at: day(9, 22), is_subscription: false },
      { amount: 320, type: "expense", category: "Food & Drink", merchant: "Swiggy", note: "Biryani night", occurred_at: day(8, 21), is_subscription: false },

      // ── Food & Drink (this week — SPIKE 3×) ────────────────
      { amount: 850, type: "expense", category: "Food & Drink", merchant: "Zomato", note: "Friday treat", occurred_at: day(3, 20), is_subscription: false },
      { amount: 620, type: "expense", category: "Food & Drink", merchant: "Swiggy", note: "Group order", occurred_at: day(2, 21), is_subscription: false },
      { amount: 480, type: "expense", category: "Food & Drink", merchant: "Zomato", note: "Late night chai", occurred_at: day(1, 23), is_subscription: false },
      { amount: 380, type: "expense", category: "Food & Drink", merchant: "Cafe Coffee Day", note: "Study session", occurred_at: day(0, 17), is_subscription: false },

      // ── Subscriptions (Netflix jump 199 → 649) ─────────────
      { amount: 199, type: "expense", category: "Subscriptions", merchant: "Netflix", note: "Mobile plan", occurred_at: day(34, 9), is_subscription: true },
      { amount: 649, type: "expense", category: "Subscriptions", merchant: "Netflix", note: "Standard plan — auto-upgraded", occurred_at: day(4, 9), is_subscription: true },
      { amount: 119, type: "expense", category: "Subscriptions", merchant: "Spotify", note: "Student", occurred_at: day(6, 9), is_subscription: true },

      // ── Other student life ─────────────────────────────────
      { amount: 3500, type: "expense", category: "Bills", merchant: "Mess Fees", note: "Monthly", occurred_at: day(20, 8), is_subscription: false },
      { amount: 4200, type: "expense", category: "Education", merchant: "Bookstore", note: "Semester textbooks", occurred_at: day(15, 14), is_subscription: false },
      { amount: 280, type: "expense", category: "Transport", merchant: "Uber", note: "Ride to campus", occurred_at: day(5, 8), is_subscription: false },
      { amount: 150, type: "expense", category: "Transport", merchant: "Auto", note: "Market run", occurred_at: day(11, 18), is_subscription: false },
      { amount: 1240, type: "expense", category: "Shopping", merchant: "Amazon", note: "Notebook + earphones", occurred_at: day(7, 16), is_subscription: false },

      // ── The ₹10,000 Party spike (highlighted in Analytics + Top Spender) ──
      { amount: 10000, type: "expense", category: "Entertainment", merchant: "Hostel Party", note: "Birthday bash — pizza + cake + decor", occurred_at: day(2, 22), is_subscription: false },
    ];

    (async () => {
      const { error } = await supabase
        .from("transactions")
        .insert(seed.map((t) => ({ ...t, user_id: user.id })));
      if (!error) {
        qc.invalidateQueries({ queryKey: ["transactions"] });
      }
    })();
  }, [user, txs, isLoading, qc]);
}
