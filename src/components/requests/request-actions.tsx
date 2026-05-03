"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import {
  adminCancelMaterialRequest,
  approveMaterialRequest,
  deleteMaterialRequest,
  rejectMaterialRequest,
} from "@/app/(dashboard)/requests/actions";
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
import { Button } from "@/components/ui/button";

export function RequestActions({
  requestId,
  canApprove,
  canReject,
  canCancel,
  canDelete = false,
  redirectAfterDelete = "/requests",
}: {
  requestId: string;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canDelete?: boolean;
  redirectAfterDelete?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");

  function runApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveMaterialRequest(requestId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function runReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectMaterialRequest(requestId, reason);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRejectOpen(false);
      setReason("");
      router.refresh();
    });
  }

  function runCancel() {
    setError(null);
    startTransition(async () => {
      const result = await adminCancelMaterialRequest(requestId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCancelOpen(false);
      router.refresh();
    });
  }

  function runDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMaterialRequest(requestId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeleteOpen(false);
      router.push(redirectAfterDelete);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canApprove && (
        <Button onClick={runApprove} disabled={isPending}>
          {isPending ? "처리 중..." : "승인하기"}
        </Button>
      )}
      {canReject && (
        <Button
          variant="outline"
          onClick={() => setRejectOpen(true)}
          disabled={isPending}
          className="border-destructive/40 text-destructive hover:bg-destructive/5"
        >
          거절
        </Button>
      )}
      {canCancel && (
        <Button
          variant="outline"
          onClick={() => setCancelOpen(true)}
          disabled={isPending}
        >
          취소
        </Button>
      )}
      {canDelete && (
        <Button
          variant="outline"
          onClick={() => setDeleteOpen(true)}
          disabled={isPending}
          className="border-destructive/40 text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="size-3.5" />
          내역 삭제
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* 거절 다이얼로그 */}
      <AlertDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectOpen(false);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 거절</AlertDialogTitle>
            <AlertDialogDescription>
              사유를 입력해주세요. 이 내용은 현장 담당자에게 표시됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="예: 해당 품목은 재고가 곧 들어올 예정이니 월요일에 다시 신청해주세요."
            className="w-full rounded border bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              onClick={runReject}
              disabled={isPending || reason.trim().length === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "처리 중..." : "거절하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 다이얼로그 */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOpen(false);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 내역 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 신청을 영구적으로 삭제합니다. 신청 항목과 함께 사라지며 복구할
              수 없습니다. 활동 로그에는 삭제 기록이 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              onClick={runDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "삭제 중..." : "삭제하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 취소 다이얼로그 */}
      <AlertDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCancelOpen(false);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 취소</AlertDialogTitle>
            <AlertDialogDescription>
              이 신청을 취소하시겠습니까? 취소 후에는 출고 처리가 불가능합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              onClick={runCancel}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "처리 중..." : "취소하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
