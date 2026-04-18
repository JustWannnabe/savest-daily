import { useState, useRef, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  FileScan,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import {
  useTransactions,
  useAddTransactionsBulk,
  type NewTransaction,
} from "@/hooks/useTransactions";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { findRecentDuplicate } from "@/lib/duplicates";
import { formatINR } from "@/lib/format";
import { CATEGORIES } from "@/lib/categories";
import { parseCsv, extractFromOcrText, type ParsedRow } from "@/lib/parseImport";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

type ReviewRow = ParsedRow & { _id: string; _duplicate?: boolean };

const ADD_CUSTOM = "__add_custom__";
const newId = () => Math.random().toString(36).slice(2, 9);

export const ImportDialog = ({ open, onOpenChange }: Props) => {
  const [tab, setTab] = useState<"csv" | "image">("csv");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "scanning" | "review" | "success">("idle");
  const [stageLabel, setStageLabel] = useState("Reading file…");
  const [liveLines, setLiveLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [customRowId, setCustomRowId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const liveBoxRef = useRef<HTMLDivElement>(null);

  const { data: existing = [] } = useTransactions();
  const { customCategories, addCustom, isCustom } = useCustomCategories();
  const bulk = useAddTransactionsBulk();

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setStage("idle");
    setStageLabel("Reading file…");
    setLiveLines([]);
    setProgress(0);
    setRows([]);
    setCustomRowId(null);
    setCustomName("");
  };

  const pushLive = (line: string) => {
    setLiveLines((prev) => [...prev, line].slice(-40));
  };

  useEffect(() => {
    liveBoxRef.current?.scrollTo({ top: liveBoxRef.current.scrollHeight, behavior: "smooth" });
  }, [liveLines]);

  const handleFile = (f: File) => {
    setFile(f);
    if (f.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  };

  const finalizeRows = (parsed: ParsedRow[]) => {
    if (parsed.length === 0) {
      toast.error("No transactions detected — try a clearer image, or add rows manually.");
      // Still open the review modal with one empty row so the user has full control
      setRows([blankRow()]);
      setStage("review");
      return;
    }
    const reviewed: ReviewRow[] = parsed.map((p) => {
      const dup = findRecentDuplicate({ amount: p.amount, category: p.category, type: p.type }, existing);
      return { ...p, _id: newId(), _duplicate: !!dup };
    });
    setRows(reviewed);
    setStage("review");
  };

  const blankRow = (): ReviewRow => ({
    _id: newId(),
    amount: 0,
    type: "expense",
    category: "Other",
    merchant: "",
    note: "Manually added",
    occurred_at: new Date().toISOString(),
    is_subscription: false,
    _source: "ocr",
  });

  const startScan = async () => {
    if (!file) return toast.error("Choose a file first");
    setStage("scanning");
    setLiveLines([]);
    setProgress(0);

    try {
      if (tab === "csv") {
        setStageLabel("Reading CSV…");
        pushLive(`> Opening ${file.name}`);
        await new Promise((r) => setTimeout(r, 200));
        pushLive("> Detecting columns: date, amount, description…");
        const parsed = await parseCsv(file);
        for (const r of parsed.slice(0, 12)) {
          pushLive(`  • ${r.merchant ?? "—"}  ₹${r.amount}  → ${r.category}`);
          await new Promise((r) => setTimeout(r, 50));
        }
        pushLive(`> Parsed ${parsed.length} row${parsed.length === 1 ? "" : "s"}`);
        await new Promise((r) => setTimeout(r, 250));
        finalizeRows(parsed);
      } else {
        setStageLabel("Initializing OCR engine…");
        pushLive("> Loading Tesseract.js (eng)…");
        const worker = await createWorker("eng", 1, {
          logger: (m: any) => {
            if (m.status) {
              setStageLabel(m.status.charAt(0).toUpperCase() + m.status.slice(1));
              if (typeof m.progress === "number") setProgress(Math.round(m.progress * 100));
            }
          },
        });
        pushLive("> Deep-scanning every line for ₹ and decimals…");
        const { data } = await worker.recognize(file);
        await worker.terminate();
        const text = data.text ?? "";
        const tLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        for (const l of tLines.slice(0, 25)) {
          pushLive(`  ${l}`);
          await new Promise((r) => setTimeout(r, 30));
        }
        const parsed = extractFromOcrText(text);
        pushLive(`> Detected ${parsed.length} potential line item${parsed.length === 1 ? "" : "s"}`);
        await new Promise((r) => setTimeout(r, 250));
        finalizeRows(parsed);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Scan failed");
      reset();
    }
  };

  const updateRow = (id: string, patch: Partial<ReviewRow>) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };
  const deleteRow = (id: string) => setRows((prev) => prev.filter((r) => r._id !== id));
  const addBlankRow = () => setRows((prev) => [...prev, blankRow()]);

  const handleCategoryChange = (id: string, v: string) => {
    if (v === ADD_CUSTOM) {
      setCustomRowId(id);
      setCustomName("");
      return;
    }
    updateRow(id, { category: v });
  };

  const commitCustom = () => {
    if (!customRowId) return;
    const saved = addCustom(customName);
    if (!saved) return toast.error("Enter a category name");
    updateRow(customRowId, { category: saved });
    setCustomRowId(null);
    setCustomName("");
  };

  const validRows = rows.filter((r) => r.amount > 0 && (r.merchant ?? "").length > 0);

  const importNow = async () => {
    if (!validRows.length) return toast.error("Each row needs a merchant and amount");

    const dupes = validRows.filter((r) => r._duplicate);
    const cleanInsert = async () => {
      const payload: NewTransaction[] = validRows.map(
        ({ _id, _duplicate, _source, ...rest }) => rest
      );
      try {
        await bulk.mutateAsync(payload);
        setStage("success");
        // Auto-close after the success animation
        setTimeout(() => {
          onOpenChange(false);
          reset();
        }, 1400);
      } catch (e: any) {
        toast.error(e.message ?? "Import failed");
      }
    };

    if (dupes.length > 0) {
      toast.warning(
        `${dupes.length} possible duplicate${dupes.length === 1 ? "" : "s"} detected`,
        {
          description: "These match recent transactions. Import anyway?",
          action: { label: "Import all", onClick: cleanInsert },
          duration: 8000,
        }
      );
      return;
    }
    await cleanInsert();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent
        className={`rounded-3xl border border-white/15 bg-background/70 backdrop-blur-xl shadow-2xl ${
          stage === "review" ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileScan className="h-5 w-5" />
            {stage === "review" ? "Review your transactions" : "Import transactions"}
          </DialogTitle>
          <DialogDescription>
            {stage === "review"
              ? "Edit anything before committing. Nothing is saved until you confirm."
              : "Upload a CSV statement or a receipt photo — we'll extract the data with OCR."}
          </DialogDescription>
        </DialogHeader>

        {stage === "idle" && (
          <Tabs value={tab} onValueChange={(v) => { setTab(v as any); reset(); }} className="mt-2">
            <TabsList className="grid grid-cols-2 w-full bg-secondary rounded-full h-10 p-1">
              <TabsTrigger value="csv" className="rounded-full"><FileText className="h-4 w-4 mr-1.5" />CSV</TabsTrigger>
              <TabsTrigger value="image" className="rounded-full"><ImageIcon className="h-4 w-4 mr-1.5" />Receipt</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="mt-4">
              <DropZone accept=".csv,text/csv" onPick={handleFile} file={file} hint="Drop a CSV bank statement" inputRef={inputRef} />
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                Looks for columns like <span className="font-medium">date, amount, description, debit, credit</span>.
              </p>
            </TabsContent>
            <TabsContent value="image" className="mt-4">
              <DropZone accept="image/*" onPick={handleFile} file={file} hint="Drop a receipt photo (JPG/PNG)" inputRef={inputRef} />
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                Real OCR via Tesseract.js — runs entirely in your browser.
              </p>
            </TabsContent>
            <Button onClick={startScan} disabled={!file} className="w-full h-11 rounded-xl mt-4 font-semibold">
              Scan file
            </Button>
          </Tabs>
        )}

        {stage === "scanning" && (
          <div className="mt-2 space-y-3">
            <div className="relative h-40 rounded-2xl overflow-hidden border border-border bg-secondary grid place-items-center">
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

            <div
              ref={liveBoxRef}
              className="h-40 rounded-2xl border border-border bg-background/60 backdrop-blur p-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-muted-foreground"
            >
              {liveLines.length === 0 ? (
                <div className="text-muted-foreground/60">Booting parser…</div>
              ) : (
                liveLines.map((l, i) => (
                  <div key={i} className={l.startsWith(">") ? "text-accent" : ""}>{l}</div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                <span>{stageLabel}</span>
              </div>
              {progress > 0 && <span className="font-num text-muted-foreground">{progress}%</span>}
            </div>
          </div>
        )}

        {stage === "review" && (
          <div className="mt-2 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {rows.length} row{rows.length === 1 ? "" : "s"} · {validRows.length} valid
              </div>
              {rows.some((r) => r._duplicate) && (
                <div className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/15 text-warning font-semibold inline-flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Duplicates flagged
                </div>
              )}
            </div>

            <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-white/10 bg-card/40 backdrop-blur-md divide-y divide-border">
              {rows.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No rows yet. Use “Add item” below to enter one manually.
                </div>
              )}
              {rows.map((r) => (
                <div
                  key={r._id}
                  className={`grid grid-cols-[1fr_auto] gap-3 p-3 transition-colors ${
                    r._duplicate ? "bg-warning/5" : ""
                  }`}
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={r.merchant ?? ""}
                        onChange={(e) => updateRow(r._id, { merchant: e.target.value })}
                        placeholder="Merchant"
                        className="h-9 rounded-lg text-sm font-medium flex-1 min-w-0"
                      />
                      {isCustom(r.category) && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold inline-flex items-center gap-0.5 shrink-0">
                          <Sparkles className="h-2.5 w-2.5" /> Custom
                        </span>
                      )}
                      {r._duplicate && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-semibold shrink-0">
                          Dupe
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-num">₹</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={r.amount || ""}
                          onChange={(e) => updateRow(r._id, { amount: parseFloat(e.target.value) || 0 })}
                          className="h-9 rounded-lg text-sm font-num pl-5"
                          placeholder="0.00"
                        />
                      </div>

                      {customRowId === r._id ? (
                        <div className="flex gap-1 flex-1 min-w-0">
                          <Input
                            autoFocus
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="New category…"
                            className="h-9 rounded-lg text-xs flex-1 min-w-0"
                          />
                          <Button type="button" size="sm" onClick={commitCustom} className="h-9 rounded-lg px-2">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => { setCustomRowId(null); setCustomName(""); }}
                            className="h-9 rounded-lg px-2"
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Select value={r.category} onValueChange={(v) => handleCategoryChange(r._id, v)}>
                          <SelectTrigger className="h-9 rounded-lg text-xs flex-1 min-w-0"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.filter((c) => c !== "Income").map((c) => (
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
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                    <div className="font-num font-semibold text-sm text-right">
                      {formatINR(r.amount || 0)}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteRow(r._id)}
                      className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addBlankRow}
              className="w-full mt-3 h-10 rounded-xl border-dashed font-medium"
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={reset} className="flex-1 rounded-xl">Cancel</Button>
              <Button
                onClick={importNow}
                disabled={bulk.isPending || validRows.length === 0}
                className="flex-1 rounded-xl font-semibold"
              >
                {bulk.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm & Import all ({validRows.length})
              </Button>
            </div>
          </div>
        )}

        {stage === "success" && (
          <div className="py-10 flex flex-col items-center justify-center gap-4 animate-fade-in-up">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-success/30 blur-2xl animate-pulse" />
              <div className="relative h-20 w-20 rounded-full bg-success/15 border-2 border-success grid place-items-center">
                <Check className="h-10 w-10 text-success animate-scale-in" strokeWidth={3} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-display font-semibold">Imported successfully</div>
              <div className="text-sm text-muted-foreground mt-1">
                {validRows.length} transaction{validRows.length === 1 ? "" : "s"} added · check your Dashboard
              </div>
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
