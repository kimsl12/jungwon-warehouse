"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { receivePurchaseOrder } from "@/app/(dashboard)/purchase-orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ReceiveItem = {
  id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  ordered_quantity: number;
  received_quantity: number;
};

export function PurchaseOrderReceiveForm({
  poId,
  items,
}: {
  poId: string;
  items: ReceiveItem[];
}) {
  const router = useRouter();
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nf = new Intl.NumberFormat("ko-KR");

  function fillAllRemaining() {
    const next: Record<string, number> = {};
    for (const it of items) {
      const remaining = it.ordered_quantity - it.received_quantity;
      if (remaining > 0) next[it.id] = remaining;
    }
    setInputs(next);
  }

  function handleSubmit() {
    setError(null);
    const receipts = items
      .map((it) => ({
        item_id: it.id,
        received_quantity: Math.max(0, Math.floor(Number(inputs[it.id] ?? 0))),
      }))
      .filter((r) => r.received_quantity > 0);

    if (receipts.length === 0) {
      setError("입고할 수량을 1 이상 입력해주세요.");
      return;
    }

    // 초과 방지 클라이언트 검증 (서버에서도 검증)
    for (const it of items) {
      const req = inputs[it.id] ?? 0;
      const remaining = it.ordered_quantity - it.received_quantity;
      if (req > remaining) {
        setError(
          `"${it.name}"의 입고 수량이 남은 수량(${nf.format(remaining)})을 초과합니다.`,
        );
        return;
      }
    }

    startTransition(async () => {
      const result = await receivePurchaseOrder({ po_id: poId, receipts });
      if (result.error) {
        setError(result.error);
        return;
      }
      setInputs({});
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={fillAllRemaining}
          className="text-xs text-secondary hover:underline"
          disabled={isPending}
        >
          남은 수량 전부 채우기
        </button>
      </div>

      <div className="rounded border overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_90px_90px_140px] gap-2 px-3 py-2 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>품목</span>
          <span className="text-right">발주</span>
          <span className="text-right">기수령</span>
          <span className="text-right">남음</span>
          <span className="text-right">이번에 입고</span>
        </div>
        {items.map((it) => {
          const remaining = it.ordered_quantity - it.received_quantity;
          const fulfilled = remaining <= 0;
          return (
            <div
              key={it.id}
              className={`grid grid-cols-[1fr_90px_90px_90px_140px] gap-2 items-center px-3 py-2 border-t text-xs ${fulfilled ? "bg-emerald-50/40 opacity-60" : ""}`}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {it.name}
                  {it.variant && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {it.variant}</span>
                  )}
                </p>
                {it.unit && <p className="text-[10px] text-muted-foreground">단위: {it.unit}</p>}
              </div>
              <span className="text-right tabular-nums">{nf.format(it.ordered_quantity)}</span>
              <span className="text-right tabular-nums text-muted-foreground">
                {nf.format(it.received_quantity)}
              </span>
              <span className="text-right tabular-nums font-semibold">
                {nf.format(remaining)}
              </span>
              <Input
                type="number"
                min={0}
                max={remaining}
                value={inputs[it.id] ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? NaN : Number(e.target.value);
                  setInputs((prev) => {
                    const next = { ...prev };
                    if (Number.isNaN(v) || v === 0) delete next[it.id];
                    else next[it.id] = v;
                    return next;
                  });
                }}
                disabled={isPending || fulfilled}
                className="h-8 text-right tabular-nums"
                placeholder="0"
              />
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "처리 중..." : "입고 확정"}
        </Button>
      </div>
    </div>
  );
}
