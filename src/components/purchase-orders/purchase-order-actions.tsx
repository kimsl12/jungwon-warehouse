"use client";

import { useTransition } from "react";
import { Send, X } from "lucide-react";

import { updatePurchaseOrderStatus } from "@/app/(dashboard)/purchase-orders/actions";
import { Button } from "@/components/ui/button";

export function PurchaseOrderActions({
  poId,
  canSend,
  canCancel,
  vendorFax: _vendorFax,
}: {
  poId: string;
  canSend: boolean;
  canCancel: boolean;
  /** 추후 C8에서 팩스 발송 기능이 붙을 때 사용 */
  vendorFax: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  function changeStatus(status: "sent" | "canceled", confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("po_id", poId);
      fd.set("status", status);
      const result = await updatePurchaseOrderStatus(fd);
      if (result.error) alert(result.error);
    });
  }

  return (
    <>
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
    </>
  );
}
