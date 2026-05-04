"use client";

import { useState, useTransition } from "react";

import {
  adjustProductStock,
  type AdjustStockState,
} from "@/app/(dashboard)/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 관리자 전용 재고 직접 보정 패널.
 * - 입출고 transactions 와 분리된 별개 메커니즘.
 * - 시스템 도입 초기 또는 실재고 정합성 맞출 때만 사용.
 * - 활동 로그에 'adjust' 로 명시 기록됨.
 */
export function StockAdjustSection({
  productId,
  productName,
  currentQuantity,
  unit,
  onAdjusted,
}: {
  productId: string;
  productName: string;
  currentQuantity: number;
  unit: string | null;
  onAdjusted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AdjustStockState>(null);
  const [isPending, startTransition] = useTransition();
  const [newQuantity, setNewQuantity] = useState<string>(String(currentQuantity));
  const [reason, setReason] = useState("");

  function runAdjust() {
    setState(null);
    const formData = new FormData();
    formData.set("product_id", productId);
    formData.set("new_quantity", newQuantity);
    formData.set("reason", reason);
    startTransition(async () => {
      const result = await adjustProductStock(null, formData);
      if (result?.success) {
        setOpen(false);
        setReason("");
        setState(null);
        onAdjusted?.();
      } else {
        setState(result);
      }
    });
  }

  if (!open) {
    return (
      <div className="rounded-md border border-dashed border-warning/40 bg-warning-bg/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">기본 재고 보정</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              입고·출고 처리 없이 재고 수량을 직접 세팅합니다. 시스템 도입 초기
              또는 실재고와 차이가 발견됐을 때만 사용하세요. 활동 로그에 보정
              이력이 남습니다.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            재고 보정
          </Button>
        </div>
      </div>
    );
  }

  const parsedNew = Number.parseInt(newQuantity, 10);
  const delta = Number.isFinite(parsedNew) ? parsedNew - currentQuantity : 0;
  const deltaLabel =
    delta > 0
      ? `+${delta.toLocaleString("ko-KR")}`
      : delta < 0
        ? delta.toLocaleString("ko-KR")
        : "0";

  return (
    <div className="space-y-3 rounded-md border border-warning/40 bg-warning-bg/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {productName} 재고 보정
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setState(null);
            setReason("");
            setNewQuantity(String(currentQuantity));
          }}
          className="text-[11px] text-muted-foreground hover:underline"
        >
          취소
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            현재 수량
          </Label>
          <div className="rounded border bg-background px-3 py-2 text-sm tabular-nums">
            {currentQuantity.toLocaleString("ko-KR")}
            {unit && (
              <span className="ml-0.5 text-[11px] text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
        </div>

        <div className="pb-2 text-center text-xs text-muted-foreground">→</div>

        <div className="space-y-1">
          <Label htmlFor="adjust-new-quantity" className="text-[11px]">
            새 수량 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="adjust-new-quantity"
            type="number"
            min={0}
            required
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            disabled={isPending}
            aria-invalid={state?.fieldErrors?.new_quantity ? true : undefined}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        변동량:{" "}
        <span
          className={
            delta > 0
              ? "font-semibold text-success"
              : delta < 0
                ? "font-semibold text-destructive"
                : "text-muted-foreground"
          }
        >
          {deltaLabel}
        </span>
      </p>

      <div className="space-y-1">
        <Label htmlFor="adjust-reason" className="text-[11px]">
          보정 사유 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="adjust-reason"
          type="text"
          required
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 시스템 도입 초기 재고 세팅 / 실사 결과 정합성 보정"
          disabled={isPending}
          aria-invalid={state?.fieldErrors?.reason ? true : undefined}
        />
        {state?.fieldErrors?.reason?.[0] && (
          <p className="text-[11px] text-destructive">
            {state.fieldErrors.reason[0]}
          </p>
        )}
      </div>

      {state?.error && (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={runAdjust}
          disabled={
            isPending ||
            !reason.trim() ||
            !Number.isFinite(parsedNew) ||
            parsedNew < 0 ||
            parsedNew === currentQuantity
          }
        >
          {isPending ? "보정 중..." : "보정 적용"}
        </Button>
      </div>
    </div>
  );
}
