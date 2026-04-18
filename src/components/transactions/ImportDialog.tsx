import { useState, useRef, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, FileText, Image as ImageIcon, Loader2, FileScan, Sparkles, ShieldAlert } from "lucide-react";
import {
  useTransactions,
  useAddTransactionsBulk,
  useAddTransaction,
  type NewTransaction,
} from "@/hooks/useTransactions";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { findRecentDuplicate } from "@/lib/duplicates";
import { formatINR } from "@/lib/format";
import { parseCsv, extractFromOcrText, type ParsedRow } from "@/lib/parseImport";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

type ReviewRow = ParsedRow & { _checked: boolean; _duplicate?: boolean };

export const ImportDialog = ({ open, onOpenChange }: Props) => {
  const [tab, setTab] = useState<"csv" | "image">("csv");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "scanning" | "review">("idle");
  const [stageLabel, setStageLabel] = useState("Reading file…");
  const [liveLines, setLiveLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const liveBoxRef = useRef<HTMLDivElement>(null);

  const { data: existing = [] } = useTransactions();
  const { isCustom } = useCustomCategories();
  const bulk = useAddTransactionsBulk();
  const addOne = useAddTransaction();

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setStage("idle");
    setStageLabel("Reading file…");
    setLiveLines([]);
    setProgress(0);
    setRows([]);
  };

  const pushLive = (line: string) => {
    setLiveLines((prev) => {
      const next = [...prev, line];
      return next.slice(-40);
    });
  };

  // Auto-scroll live preview
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
      toast.error("No transactions detected. Try a clearer image or different file.");
      reset();
      return;
    }
    const reviewed: ReviewRow[] = parsed.map((p) => {
      const dup = findRecentDuplicate({ amount: p.amount, category: p.category, type: p.type }, existing);
      return { ...p, _checked: !dup, _duplicate: !!dup };
    });
    setRows(reviewed);
    setStage("review");
  };

  const startScan = async () => {
    if (!file) return toast.error("Choose a file first");
    setStage("scanning");
    setLiveLines([]);
    setProgress(0);

    try {
      if (tab === "csv") {
        setStageLabel("Reading CSV…");
        pushLive(`> Opening ${file.name}`);
        await new Promise((r) => setTimeout(r, 250));
        pushLive("> Detecting columns: date, amount, description…");
        const parsed = await parseCsv(file);
        for (const r of parsed.slice(0, 12)) {
          pushLive(`  • ${r.merchant ?? "—"}  ₹${r.amount}  → ${r.category}`);
          await new Promise((r) => setTimeout(r, 60));
        }
        pushLive(`> Parsed ${parsed.length} row${parsed.length === 1 ? "" : "s"}`);
        await new Promise((r) => setTimeout(r, 300));
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
        pushLive("> Scanning image for ₹ and Rs amounts…");
        const { data } = await worker.recognize(file);
        await worker.terminate();
        const text = data.text ?? "";
        // Stream the recognized text into the live preview
        const tLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        for (const l of tLines.slice(0, 25)) {
          pushLive(`  ${l}`);
          await new Promise((r) => setTimeout(r, 35));
        }
        const parsed = extractFromOcrText(text);
        pushLive(`> Detected ${parsed.length} potential transaction${parsed.length === 1 ? "" : "s"}`);
        await new Promise((r) => setTimeout(r, 300));
        finalizeRows(parsed);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Scan failed");
      reset();
    }
  };

  const importNow = async () => {
    const selected = rows.filter((r) => r._checked);
    if (!selected.length) return toast.error("Select at least one row");

    const dupes = selected.filter((r) => r._duplicate);
    const cleanInsert = async () => {
      const payload: NewTransaction[] = selected.map(({ _checked, _duplicate, _source, ...rest }) => rest);
      try {
        // If there's a single row and it's a duplicate the user explicitly toggled on,
        // we already showed the badge — so just insert.
        await bulk.mutateAsync(payload);
        toast.success(`Imported ${payload.length} transaction${payload.length === 1 ? "" : "s"}`);
        onOpenChange(false);
        reset();
      } catch (e: any) {
        toast.error(e.message ?? "Import failed");
      }
    };

    if (dupes.length > 0) {
      // Lightweight inline confirmation via window.confirm equivalent — use toast with action
      toast.warning(
        `${dupes.length} possible duplicate${dupes.length === 1 ? "" : "s"} selected`,
        {
          description: "These match recent transactions. Import anyway?",
          action: { label: "Import", onClick: cleanInsert },
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
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileScan className="h-5 w-5" /> Import transactions
          </DialogTitle>
          <DialogDescription>
            Upload a CSV statement or a receipt photo — we'll extract the data with OCR.
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

            {/* Live OCR / parse log */}
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
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">
                {rows.filter((r) => r._checked).length} of {rows.length} selected
              </div>
              {rows.some((r) => r._duplicate) && (
                <div className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/15 text-warning font-semibold inline-flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Duplicates flagged
                </div>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {rows.map((r, i) => (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    r._duplicate
                      ? "border-warning/40 bg-warning/5 hover:bg-warning/10"
                      : "border-border hover:bg-secondary/60"
                  }`}
                >
                  <Checkbox
                    checked={r._checked}
                    onCheckedChange={(v) =>
                      setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, _checked: !!v } : row)))
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {r.merchant ?? r.category}
                      {isCustom(r.category) && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold inline-flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> Custom
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>{r.category}</span>
                      <span>·</span>
                      <span>{new Date(r.occurred_at).toLocaleDateString("en-IN")}</span>
                      {r._duplicate && (
                        <span className="text-warning font-medium">· duplicate of recent</span>
                      )}
                    </div>
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
