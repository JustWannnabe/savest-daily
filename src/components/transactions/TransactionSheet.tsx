import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES } from "@/lib/categories";
import { useAddTransaction, useUpdateTransaction, type Transaction } from "@/hooks/useTransactions";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Transaction | null;
};

export const TransactionSheet = ({ open, onOpenChange, editing }: Props) => {
  const add = useAddTransaction();
  const update = useUpdateTransaction();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Food & Drink");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSub, setIsSub] = useState(false);

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
  }, [editing, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    const payload = {
      type,
      amount: amt,
      category: type === "income" ? "Income" : category,
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

  return (
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
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== "Income").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
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
  );
};
