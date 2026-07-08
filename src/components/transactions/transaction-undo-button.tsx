"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";

import { undoTransaction } from "@/app/(dashboard)/transactions/actions";
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

/**
 * 20분 이내에 본인이 작성한 입출고 트랜잭션을 취소하는 버튼.
 * 취소 시 반대 방향 트랜잭션을 생성해 재고를 복구한다.
 */
export function TransactionUndoButton({
  txId,
  label = "취소",
}: {
  txId: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await undoTransaction(txId, reason.trim() || null);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("거래가 취소되었습니다 — 재고가 복구되었습니다.");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded bg-surface-low px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-high"
      >
        <Undo2 className="h-3 w-3" /> {label}
      </button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>처리 취소</AlertDialogTitle>
            <AlertDialogDescription>
              이 입출고 처리를 취소합니다. 반대 방향 트랜잭션이 생성되어 재고가 원래대로
              돌아갑니다. 취소 후에는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="undo-reason">
              취소 사유 (선택)
            </label>
            <input
              id="undo-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="예: 수량 오기입"
              className="w-full rounded border bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "처리 중..." : "취소하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
