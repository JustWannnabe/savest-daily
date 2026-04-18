import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTransactions, useDeleteTransaction, type Transaction } from "@/hooks/useTransactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { ImportDialog } from "@/components/transactions/ImportDialog";
import { Plus, Search, Upload, Pencil, Trash2, ArrowUpRight, ArrowDownLeft, Repeat, Sparkles } from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/categories";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Transactions() {
  const { data: txs = [], isLoading } = useTransactions();
  const { customCategories, isCustom } = useCustomCategories();
  const del = useDeleteTransaction();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [type, setType] = useState<string>("all");

  // Highlight a specific transaction when navigated from an Alert.
  const location = useLocation();
  const highlightTxId = (location.state as { highlightTxId?: string } | null)?.highlightTxId;
  const [activeHighlight, setActiveHighlight] = useState<string | null>(highlightTxId ?? null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightTxId) return;
    setActiveHighlight(highlightTxId);
    // wait one frame so the row is in the DOM
    const t = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    const fade = setTimeout(() => setActiveHighlight(null), 3200);
    return () => {
      clearTimeout(t);
      clearTimeout(fade);
    };
  }, [highlightTxId]);

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(t.merchant ?? "").toLowerCase().includes(q) &&
            !(t.note ?? "").toLowerCase().includes(q) &&
            !t.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [txs, search, cat, type]);

  const grouped = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = new Date(t.occurred_at).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  const onDelete = async () => {
    if (!confirmDel) return;
    try {
      await del.mutateAsync(confirmDel);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmDel(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search merchant, note, category…" className="pl-9 h-11 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-32 h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-40 h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              {customCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-accent" /> {c}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setImportOpen(true)} className="rounded-xl h-10">
          <Upload className="h-4 w-4" /> Import
        </Button>
        <Button onClick={() => { setEditing(null); setSheetOpen(true); }} className="rounded-xl h-10 ml-auto">
          <Plus className="h-4 w-4" /> Add transaction
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="surface-md rounded-3xl p-12 border border-border text-center">
          <div className="text-sm text-muted-foreground">No transactions match your filters.</div>
          <Button onClick={() => { setEditing(null); setSheetOpen(true); }} className="mt-4 rounded-xl">
            <Plus className="h-4 w-4" /> Add your first
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => {
            const dayTotal = items.filter(i => i.type === "expense").reduce((s, i) => s + i.amount, 0);
            return (
              <div key={day}>
                <div className="flex items-baseline justify-between px-1 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</h3>
                  <span className="text-xs text-muted-foreground font-num">{formatINR(dayTotal, { compact: true })} spent</span>
                </div>
                <div className="surface rounded-2xl border border-border overflow-hidden">
                  {items.map((t, idx) => {
                    const isHL = activeHighlight === t.id;
                    return (
                      <div
                        key={t.id}
                        ref={isHL ? highlightRef : undefined}
                        className={`flex items-center gap-3 px-4 py-3 group transition-colors ${
                          idx > 0 ? "border-t border-border" : ""
                        } ${isHL ? "bg-warning/10 ring-1 ring-warning/40" : ""}`}
                      >
                        <div className="h-10 w-10 rounded-full grid place-items-center shrink-0" style={{ background: `${CATEGORY_COLORS[t.category] ?? "hsl(var(--muted))"}20` }}>
                          {t.type === "income" ? (
                            <ArrowDownLeft className="h-4 w-4 text-success" />
                          ) : t.is_subscription ? (
                            <Repeat className="h-4 w-4" style={{ color: CATEGORY_COLORS[t.category] }} />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" style={{ color: CATEGORY_COLORS[t.category] ?? "hsl(var(--muted-foreground))" }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5">
                            <span className="truncate">{t.merchant ?? t.category}</span>
                            {isCustom(t.category) && (
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold inline-flex items-center gap-0.5 shrink-0">
                                <Sparkles className="h-2.5 w-2.5" /> Custom
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {t.category}{t.note ? ` · ${t.note}` : ""}
                          </div>
                        </div>
                        <div className={`font-num font-semibold text-sm shrink-0 ${t.type === "income" ? "text-success" : ""}`}>
                          {t.type === "income" ? "+" : "−"}{formatINR(t.amount)}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(t); setSheetOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDel(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TransactionSheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditing(null); }} editing={editing} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
