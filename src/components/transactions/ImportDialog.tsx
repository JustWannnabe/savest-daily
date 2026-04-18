import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, FileText, Image as ImageIcon, Loader2, FileScan } from "lucide-react";
import { useAddTransactionsBulk, type NewTransaction } from "@/hooks/useTransactions";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

const SAMPLE: NewTransaction[] = [
  { type: "expense", amount: 249, category: "Food & Drink", merchant: "Zomato", note: "Dinner order", occurred_at: "", is_subscription: false },
  { type: "expense", amount: 189, category: "Transport", merchant: "Uber", note: "Cab to campus", occurred_at: "", is_subscription: false },
  { type: "expense", amount: 1299, category: "Shopping", merchant: "Amazon", note: "Notebooks & pens", occurred_at: "", is_subscription: false },
  { type: "expense", amount: 119, category: "Subscriptions", merchant: "Spotify", note: "Premium monthly", occurred_at: "", is_subscription: true },
  { type: "expense", amount: 540, category: "Groceries", merchant: "BigBasket", note: "Weekly groceries", occurred_at: "", is_subscription: false },
  { type: "expense", amount: 320, category: "Entertainment", merchant: "BookMyShow", note: "Movie ticket", occurred_at: "", is_subscription: false },
];

const STAGES = ["Reading file…", "Detecting merchants…", "Categorizing transactions…"];

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

export const ImportDialog = ({ open, onOpenChange }: Props) => {
  const [tab, setTab] = useState<"csv" | "image">("csv");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "scanning" | "review">("idle");
  const [stageIdx, setStageIdx] = useState(0);
  const [rows, setRows] = useState<(NewTransaction & { _checked: boolean })[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const bulk = useAddTransactionsBulk();

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setStage("idle");
    setStageIdx(0);
    setRows([]);
  };

  const handleFile = (f: File) => {
    setFile(f);
    if (f.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  };

  const startScan = () => {
    if (!file) return toast.error("Choose a file first");
    setStage("scanning");
    setStageIdx(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i < STAGES.length) setStageIdx(i);
      else {
        clearInterval(id);
        const now = Date.now();
        const generated = SAMPLE.map((s, idx) => ({
          ...s,
          occurred_at: new Date(now - (idx + 1) * 86400000 * (1 + Math.random() * 1.5)).toISOString(),
          _checked: true,
        }));
        setRows(generated);
        setStage("review");
      }
    }, 850);
  };

  const importNow = async () => {
    const selected = rows.filter((r) => r._checked).map(({ _checked, ...rest }) => rest);
    if (!selected.length) return toast.error("Select at least one row");
    try {
      await bulk.mutateAsync(selected);
      toast.success(`Imported ${selected.length} transactions`);
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileScan className="h-5 w-5" /> Import transactions
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground ml-1">Demo</span>
          </DialogTitle>
          <DialogDescription>Upload a statement or receipt — we'll auto-extract transactions.</DialogDescription>
        </DialogHeader>

        {stage === "idle" && (
          <Tabs value={tab} onValueChange={(v) => { setTab(v as any); reset(); }} className="mt-2">
            <TabsList className="grid grid-cols-2 w-full bg-secondary rounded-full h-10 p-1">
              <TabsTrigger value="csv" className="rounded-full"><FileText className="h-4 w-4 mr-1.5" />CSV</TabsTrigger>
              <TabsTrigger value="image" className="rounded-full"><ImageIcon className="h-4 w-4 mr-1.5" />Receipt</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="mt-4">
              <DropZone accept=".csv,text/csv" onPick={handleFile} file={file} hint="Drop a CSV bank statement" inputRef={inputRef} />
            </TabsContent>
            <TabsContent value="image" className="mt-4">
              <DropZone accept="image/*" onPick={handleFile} file={file} hint="Drop a receipt photo (JPG/PNG)" inputRef={inputRef} />
            </TabsContent>
            <Button onClick={startScan} disabled={!file} className="w-full h-11 rounded-xl mt-4 font-semibold">
              Scan file
            </Button>
          </Tabs>
        )}

        {stage === "scanning" && (
          <div className="mt-2 space-y-4">
            <div className="relative h-48 rounded-2xl overflow-hidden border border-border bg-secondary grid place-items-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Receipt preview" className="h-full w-full object-cover opacity-70" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  <span className="text-sm font-medium">{file?.name}</span>
                </div>
              )}
              <div className="absolute inset-0 scanline pointer-events-none" />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span>{STAGES[stageIdx]}</span>
            </div>
          </div>
        )}

        {stage === "review" && (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-2">{rows.filter((r) => r._checked).length} of {rows.length} selected</div>
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {rows.map((r, i) => (
                <label
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/60 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={r._checked}
                    onCheckedChange={(v) =>
                      setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, _checked: !!v } : row)))
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.merchant}</div>
                    <div className="text-xs text-muted-foreground">{r.category} · {new Date(r.occurred_at).toLocaleDateString("en-IN")}</div>
                  </div>
                  <div className="font-num font-semibold text-sm">{formatINR(r.amount)}</div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={reset} className="flex-1 rounded-xl">Cancel</Button>
              <Button onClick={importNow} disabled={bulk.isPending} className="flex-1 rounded-xl font-semibold">
                {bulk.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Import {rows.filter((r) => r._checked).length}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const DropZone = ({
  accept,
  onPick,
  file,
  hint,
  inputRef,
}: {
  accept: string;
  onPick: (f: File) => void;
  file: File | null;
  hint: string;
  inputRef: React.RefObject<HTMLInputElement>;
}) => (
  <div
    onClick={() => inputRef.current?.click()}
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) onPick(f);
    }}
    className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
  >
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onPick(f);
      }}
    />
    <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground" />
    <div className="mt-2 text-sm font-medium">{file ? file.name : hint}</div>
    <div className="text-xs text-muted-foreground mt-0.5">Click or drop to upload</div>
  </div>
);
