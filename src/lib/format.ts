// All date/time formatting + math is locked to Asia/Kolkata (IST)
// to keep streak calculations and UI consistent for Indian users.
export const APP_TZ = "Asia/Kolkata";

export const formatINR = (n: number, opts: { compact?: boolean } = {}) => {
  const v = Number.isFinite(n) ? n : 0;
  if (opts.compact && Math.abs(v) >= 100000) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
};

/** Short month/day in IST e.g. "18 Apr". */
export const formatDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
  });
};

/** Full date e.g. "18 Apr 2026" — preferred default for the UI. */
export const formatDateLong = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * Returns YYYY-MM-DD string for the given Date as seen in IST.
 * Used for grouping transactions/streaks by "day" without timezone drift.
 */
export const istDayKey = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  // en-CA gives ISO-like YYYY-MM-DD output
  return date.toLocaleDateString("en-CA", { timeZone: APP_TZ });
};

/** Today's IST day key. */
export const istTodayKey = () => istDayKey(new Date());

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
