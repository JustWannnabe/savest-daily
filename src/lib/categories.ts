export const CATEGORIES = [
  "Food & Drink",
  "Transport",
  "Shopping",
  "Subscriptions",
  "Bills",
  "Entertainment",
  "Education",
  "Health",
  "Groceries",
  "Income",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Drink": "hsl(12 76% 61%)",
  Transport: "hsl(199 89% 55%)",
  Shopping: "hsl(280 65% 60%)",
  Subscriptions: "hsl(38 92% 55%)",
  Bills: "hsl(346 77% 60%)",
  Entertainment: "hsl(262 70% 60%)",
  Education: "hsl(173 80% 40%)",
  Health: "hsl(142 70% 45%)",
  Groceries: "hsl(95 60% 50%)",
  Income: "hsl(158 64% 42%)",
  Other: "hsl(220 9% 55%)",
};
