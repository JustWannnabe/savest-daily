import Papa from "papaparse";
import type { NewTransaction } from "@/hooks/useTransactions";

/* ------------------------------------------------------------------ */
/*  Heuristic merchant → category mapping                              */
/* ------------------------------------------------------------------ */
const MERCHANT_RULES: Array<{ test: RegExp; category: string; sub?: boolean }> = [
  { test: /zomato|swiggy|dominos|pizza|kfc|mcdonald|burger|cafe|coffee|chai|canteen|dhaba|restaurant/i, category: "Food & Drink" },
  { test: /uber|ola|rapido|metro|auto|petrol|diesel|fuel/i, category: "Transport" },
  { test: /amazon|flipkart|myntra|ajio|nykaa|meesho|shop/i, category: "Shopping" },
  { test: /netflix|spotify|prime|hotstar|youtube|jiosaavn|gaana/i, category: "Subscriptions", sub: true },
  { test: /electricity|recharge|airtel|jio|vi |bsnl|gas|water|rent|mess/i, category: "Bills" },
  { test: /bookmyshow|pvr|inox|movie|game|party/i, category: "Entertainment" },
  { test: /bookstore|udemy|coursera|tuition|college|fees|exam/i, category: "Education" },
  { test: /pharmacy|hospital|clinic|apollo|medplus|1mg|netmeds/i, category: "Health" },
  { test: /bigbasket|grofers|blinkit|dmart|reliance fresh|grocery/i, category: "Groceries" },
];

const guessCategory = (text: string) => {
  for (const r of MERCHANT_RULES) if (r.test.test(text)) return { category: r.category, sub: !!r.sub };
  return { category: "Other", sub: false };
};

const cleanMerchant = (raw: string) => {
  let m = raw.replace(/[^A-Za-z0-9 &.'-]+/g, " ").replace(/\s+/g, " ").trim();
  // Drop trailing transaction-id-ish noise
  m = m.replace(/\b\d{6,}\b/g, "").trim();
  if (!m) return null;
  // Title-case but keep ALLCAPS short tokens
  return m
    .split(" ")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
};

const parseAmount = (raw: string): number | null => {
  if (!raw) return null;
  const cleaned = raw.replace(/[₹$,]/g, "").replace(/\s/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const parseDate = (raw: string): string => {
  if (!raw) return new Date().toISOString();
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const dt = new Date(year, Number(m) - 1, Number(d));
    if (!isNaN(dt.getTime())) return dt.toISOString();
  }
  const dt = new Date(raw);
  return isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
};

/* ------------------------------------------------------------------ */
/*  CSV parser                                                         */
/* ------------------------------------------------------------------ */
export type ParsedRow = NewTransaction & { _source: "csv" | "ocr" };

export async function parseCsv(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const rows: ParsedRow[] = [];
        for (const r of res.data) {
          const keys = Object.keys(r);
          const get = (...names: string[]) => {
            for (const n of names) {
              const k = keys.find((k) => k.includes(n));
              if (k && r[k]) return r[k];
            }
            return "";
          };
          const desc = get("description", "narration", "details", "merchant", "particular", "note");
          const dateStr = get("date", "txn date", "transaction date", "value date");
          const debit = parseAmount(get("debit", "withdrawal", "spent"));
          const credit = parseAmount(get("credit", "deposit", "received"));
          const amountSingle = parseAmount(get("amount", "value"));
          const type: "income" | "expense" = credit && !debit ? "income" : "expense";
          const amount = debit ?? credit ?? amountSingle;
          if (!amount) continue;
          const merchant = cleanMerchant(desc) ?? "Unknown";
          const { category, sub } = type === "income"
            ? { category: "Income", sub: false }
            : guessCategory(desc || merchant);
          rows.push({
            amount,
            type,
            category,
            merchant,
            note: null,
            occurred_at: parseDate(dateStr),
            is_subscription: sub,
            _source: "csv",
          });
        }
        resolve(rows.slice(0, 50)); // safety cap
      },
      error: (err) => reject(err),
    });
  });
}

/* ------------------------------------------------------------------ */
/*  OCR extractor — pulls amounts + nearby merchant from raw text      */
/* ------------------------------------------------------------------ */
export function extractFromOcrText(text: string): ParsedRow[] {
  if (!text || text.trim().length < 4) return [];
  // Normalize
  const normalized = text.replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Currency-anchored amount regex: ₹ or Rs followed by a number, OR a number with 2 decimals
  const amountRe = /(?:₹|Rs\.?|INR)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|\\b([0-9]{2,}(?:,[0-9]{3})*(?:\.[0-9]{2}))\\b/gi;

  type Hit = { amount: number; merchant: string };
  const hits: Hit[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m: RegExpExecArray | null;
    amountRe.lastIndex = 0;
    while ((m = amountRe.exec(line))) {
      const raw = m[1] ?? m[2];
      const amt = parseAmount(raw);
      if (!amt || amt < 5 || amt > 500000) continue;
      // Merchant guess: use a non-numeric line above (or the same line minus the amount)
      let merchantSrc = line.replace(m[0], "").replace(/[:\\-|]+/g, " ").trim();
      if (merchantSrc.length < 3) {
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          if (!/\d/.test(lines[j]) && lines[j].length >= 3) { merchantSrc = lines[j]; break; }
        }
      }
      if (merchantSrc.length < 3) merchantSrc = "Receipt item";
      const merchant = cleanMerchant(merchantSrc) ?? "Receipt item";
      const key = `${merchant.toLowerCase()}|${amt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ amount: amt, merchant });
    }
  }

  // Try to detect a date anywhere in the text
  const dateMatch = normalized.match(/\b(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})\b/);
  const occurred_at = dateMatch ? parseDate(dateMatch[1]) : new Date().toISOString();

  // Prefer larger / more "total"-like amounts first (cap to top 8 to keep UI tidy)
  hits.sort((a, b) => b.amount - a.amount);
  const top = hits.slice(0, 8);

  return top.map((h) => {
    const { category, sub } = guessCategory(h.merchant);
    return {
      amount: h.amount,
      type: "expense" as const,
      category,
      merchant: h.merchant,
      note: "Imported from receipt",
      occurred_at,
      is_subscription: sub,
      _source: "ocr" as const,
    };
  });
}
