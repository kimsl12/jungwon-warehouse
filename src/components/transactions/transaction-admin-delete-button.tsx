"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { adminCancelTransaction } from "@/app/(dashboard)/transactions/actions";
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
 * admin 전용 입출고 삭제 버튼. 시간/소유자 제한 없음.
 * 자재 신청·발주 연계 건은 RPC 측에서 차단.
 */
export function TransactionAdminDeleteButton({ txId }: { txId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await adminCancelTransaction(txId, reason.trim() || null);
      if (result.error) {
        setError(result.error);
        return;
      }
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
        className="inline-flex items-center gap-1 rounded bg-surface-low px-2 py-1 text-[11px] text-muted-foreground hover:bg-danger-bg hover:text-danger"
      >
        <Trash2 className="h-3 w-3" /> 삭제
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
            <AlertDialogTitle>입출고 삭제 (관리자)</AlertDialogTitle>
            <AlertDialogDescription>
              이 입출고 건을 삭제합니다. 반대 방향 트랜잭션이 자동 생성되어
              재고가 원래대로 복구됩니다. 삭제 후에는 복구할 수 없습니다. 자재
              신청·발주 연계 건은 해당 화면에서 처리해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="admin-cancel-reason"
            >
              삭제 사유 (선택)
            </label>
            <input
              id="admin-cancel-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="예: 중복 등록, 수량 오기입"
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
              {isPending ? "처리 중..." : "삭제하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
