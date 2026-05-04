"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Printer, Send, Trash2, X } from "lucide-react";

import {
  deletePurchaseOrder,
  sendPurchaseOrderFax,
  updatePurchaseOrderStatus,
} from "@/app/(dashboard)/purchase-orders/actions";
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

export function PurchaseOrderActions({
  poId,
  canSend,
  canCancel,
  canDelete,
  vendorFax,
  faxConfigured,
}: {
  poId: string;
  canSend: boolean;
  canCancel: boolean;
  canDelete: boolean;
  vendorFax: string | null;
  /** Vercel env로 팩스 API가 설정되어 있는지 (서버에서 주입) */
  faxConfigured: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeStatus(status: "sent" | "canceled", confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("po_id", poId);
      fd.set("status", status);
      const result = await updatePurchaseOrderStatus(fd);
      if (result.error) alert(result.error);
      else router.refresh();
    });
  }

  function sendFax() {
    if (!vendorFax) {
      alert("거래처의 팩스번호가 등록되어 있지 않습니다.");
      return;
    }
    if (!confirm(`거래처 팩스 ${vendorFax} 로 발주서를 전송하시겠습니까?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("po_id", poId);
      const result = await sendPurchaseOrderFax(fd);
      if (result.error) alert(result.error);
      else {
        alert("팩스 발송 요청이 접수되었습니다.");
        router.refresh();
      }
    });
  }

  function runDelete() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("po_id", poId);
      const result = await deletePurchaseOrder(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeleteOpen(false);
      router.push("/purchase-orders");
      router.refresh();
    });
  }

  // 팩스 버튼은 설정 여부에 관계없이 표시하되, 미설정 시 툴팁으로 안내
  const faxBtnTitle = !faxConfigured
    ? "팩스 API 환경변수(FAX_API_BASE_URL, FAX_API_KEY, FAX_SENDER_NUMBER) 미설정"
    : !vendorFax
      ? "거래처에 팩스번호가 등록되어 있지 않음"
      : `${vendorFax} 로 전송`;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={sendFax}
        disabled={isPending || !faxConfigured || !vendorFax}
        title={faxBtnTitle}
      >
        <Printer className="h-3.5 w-3.5 mr-1" />
        팩스 발송
      </Button>

      {canSend && (
        <Button
          type="button"
          size="sm"
          onClick={() => changeStatus("sent", "이 발주서를 '발송' 상태로 변경하시겠습니까?")}
          disabled={isPending}
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          발송 상태로 변경
        </Button>
      )}
      {canCancel && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => changeStatus("canceled", "이 발주서를 취소하시겠습니까?")}
          disabled={isPending}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          취소
        </Button>
      )}
      {canDelete && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDeleteOpen(true)}
          disabled={isPending}
          className="border-destructive/40 text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          내역 삭제
        </Button>
      )}

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
            <AlertDialogTitle>발주서 영구 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 발주서와 모든 라인 아이템을 영구 삭제합니다. 복구할 수 없으며,
              활동 로그에는 삭제 기록이 남습니다. 입고 처리된 재고 변동 이력은
              그대로 보존됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              onClick={runDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "삭제 중..." : "영구 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
