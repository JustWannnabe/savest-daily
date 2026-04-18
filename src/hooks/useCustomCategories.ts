import { useCallback, useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";

const KEY = "moneyflow:custom_categories";

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
};

/** Custom categories are persisted in localStorage and broadcast across the app. */
export function useCustomCategories() {
  const [custom, setCustom] = useState<string[]>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCustom(read());
    };
    const onCustom = () => setCustom(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener("moneyflow:categories-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("moneyflow:categories-changed", onCustom);
    };
  }, []);

  const addCustom = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return null;
    const exists =
      CATEGORIES.some((c) => c.toLowerCase() === clean.toLowerCase()) ||
      read().some((c) => c.toLowerCase() === clean.toLowerCase());
    if (exists) return clean;
    const next = [...read(), clean];
    localStorage.setItem(KEY, JSON.stringify(next));
    setCustom(next);
    window.dispatchEvent(new Event("moneyflow:categories-changed"));
    return clean;
  }, []);

  const isCustom = useCallback(
    (name: string) =>
      !!name && !CATEGORIES.some((c) => c.toLowerCase() === name.toLowerCase()),
    []
  );

  return {
    customCategories: custom,
    allCategories: [...CATEGORIES, ...custom] as string[],
    addCustom,
    isCustom,
  };
}
