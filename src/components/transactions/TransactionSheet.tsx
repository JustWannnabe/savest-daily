import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Sparkles } from "lucide-react";
import {
  useAddTransaction,
  useUpdateTransaction,
  useTransactions,
  type Transaction,
} from "@/hooks/useTransactions";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { findRecentDuplicate } from "@/lib/duplicates";
import { DuplicateShieldDialog } from "./DuplicateShieldDialog";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Transaction | null;
};

const ADD_CUSTOM = "__add_custom__";

export const TransactionSheet = ({ open, onOpenChange, editing }: Props) => {
  const add = useAddTransaction();
  const update = useUpdateTransaction();
  const { data: existing = [] } = useTransactions();
  const { customCategories, addCustom, isCustom } = useCustomCategories();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Food & Drink");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSub, setIsSub] = useState(false);

  // Custom category UI
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");

  // Duplicate shield
  const [pendingDuplicate, setPendingDuplicate] = useState<Transaction | null>(null);

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setMerchant(editing.merchant ?? "");
      setNote(editing.note ?? "");
      setDate(editing.occurred_at.slice(0, 10));
      setIsSub(editing.is_subscription);
    } else if (open) {
      setType("expense");
      setAmount("");
      setCategory("Food & Drink");
      setMerchant("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      setIsSub(false);
    }
    setCustomMode(false);
    setCustomName("");
  }, [editing, open]);

  const persist = async () => {
    const amt = parseFloat(amount);
    const finalCategory = type === "income" ? "Income" : category;
    const payload = {
      type,
      amount: amt,
      category: finalCategory,
      merchant: merchant || null,
      note: note || null,
      occurred_at: new Date(date).toISOString(),
      is_subscription: isSub,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast.success("Transaction updated");
      } else {
        await add.mutateAsync(payload);
        toast.success("Transaction added");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");

    // Save custom category if user typed one
    if (customMode) {
      const saved = addCustom(customName);
      if (!saved) return toast.error("Enter a category name");
      setCategory(saved);
      setCustomMode(false);
    }

    // Skip duplicate check when editing the same row
    if (!editing) {
      const dup = findRecentDuplicate(
        { amount: amt, category: type === "income" ? "Income" : (customMode ? customName.trim() : category), type },
        existing
      );
      if (dup) {
        setPendingDuplicate(dup);
        return;
      }
    }
    await persist();
  };

  const handleCategoryChange = (v: string) => {
    if (v === ADD_CUSTOM) {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    setCategory(v);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit transaction" : "Add transaction"}</SheetTitle>
            <SheetDescription>{editing ? "Update the details below." : "Log a new income or expense."}</SheetDescription>
          </SheetHeader>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-xl">
              <button type="button" onClick={() => setType("expense")} className={`h-9 rounded-lg text-sm font-medium transition-colors ${type === "expense" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Expense</button>
              <button type="button" onClick={() => setType("income")} className={`h-9 rounded-lg text-sm font-medium transition-colors ${type === "income" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Income</button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" className="rounded-xl h-12 text-2xl font-display font-num" required />
            </div>

            {type === "expense" && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Category
                  {!customMode && isCustom(category) && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold inline-flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Custom
                    </span>
                  )}
                </Label>

                {customMode ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Hostel Mess, Cricket Kit…"
                      className="rounded-xl h-11 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setCustomMode(false); setCustomName(""); }}
                      className="rounded-xl h-11"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select value={category} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Food & Drink","Transport","Shopping","Subscriptions","Bills","Entertainment","Education","Health","Groceries","Other"]).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                      {customCategories.length > 0 && <SelectSeparator />}
                      {customCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          <span className="inline-flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-accent" /> {c}
                          </span>
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value={ADD_CUSTOM} className="text-accent font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Add custom category
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="merchant">Merchant</Label>
              <Input id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Zomato, Uber, …" className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className="rounded-xl" rows={2} />
            </div>
            {type === "expense" && (
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <div className="text-sm font-medium">Recurring subscription</div>
                  <div className="text-xs text-muted-foreground">Helps detect price hikes</div>
                </div>
                <Switch checked={isSub} onCheckedChange={setIsSub} />
              </div>
            )}
            <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={add.isPending || update.isPending}>
              {editing ? "Save changes" : "Add transaction"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <DuplicateShieldDialog
        open={!!pendingDuplicate}
        onOpenChange={(o) => !o && setPendingDuplicate(null)}
        duplicate={pendingDuplicate}
        onConfirm={async () => {
          setPendingDuplicate(null);
          await persist();
        }}
      />
    </>
  );
};
