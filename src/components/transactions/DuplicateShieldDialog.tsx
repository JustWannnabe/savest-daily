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
import { ShieldAlert } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Transaction } from "@/hooks/useTransactions";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  duplicate: Transaction | null;
  onConfirm: () => void;
};

export const DuplicateShieldDialog = ({ open, onOpenChange, duplicate, onConfirm }: Props) => {
  if (!duplicate) return null;
  const when = new Date(duplicate.occurred_at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl max-w-md border-warning/40">
        <AlertDialogHeader>
          <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-warning/15 ring-1 ring-warning/40 mb-2">
            <ShieldAlert className="h-7 w-7 text-warning" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Duplicate detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed">
            Bhai, ye entry pehle bhi ho chuki hai! You added{" "}
            <span className="font-num font-semibold text-foreground">
              {formatINR(Number(duplicate.amount))}
            </span>{" "}
            for{" "}
            <span className="font-semibold text-foreground">{duplicate.category}</span>{" "}
            recently. Sure you want to add it again?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-2xl border border-border bg-secondary/40 p-3 my-2">
          <div className="flex items-center justify-between text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{duplicate.merchant ?? duplicate.category}</div>
              <div className="text-xs text-muted-foreground">{when}</div>
            </div>
            <div className="font-num font-semibold">{formatINR(Number(duplicate.amount))}</div>
          </div>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-xl flex-1">No, cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl flex-1 bg-warning text-warning-foreground hover:bg-warning/90"
          >
            Yes, add anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
