"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { fulfillMaterialRequest } from "@/app/(dashboard)/requests/actions";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  product_name: string;
  product_variant: string | null;
  unit: string | null;
  requested_quantity: number;
  fulfilled_quantity: number;
  note: string | null;
};

export function RequestFulfillForm({
  requestId,
  items,
}: {
  requestId: string;
  items: Item[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const remainingTotal = useMemo(
    () => items.reduce((s, it) => s + (it.requested_quantity - it.fulfilled_quantity), 0),
    [items],
  );

  function setAll() {
    const next: Record<string, string> = {};
    for (const it of items) {
      const rem = it.requested_quantity - it.fulfilled_quantity;
      if (rem > 0) next[it.id] = String(rem);
    }
    setAmounts(next);
  }

  function handleSubmit() {
    setError(null);

    const fulfillments = items
      .map((it) => {
        const raw = amounts[it.id]?.trim();
        if (!raw) return null;
        const qty = Number.parseInt(raw, 10);
        if (!Number.isFinite(qty) || qty <= 0) return null;
        const rem = it.requested_quantity - it.fulfilled_quantity;
        if (qty > rem) {
          throw new Error(`${it.product_name}: 남은 수량(${rem})을 초과했습니다.`);
        }
        return { item_id: it.id, quantity: qty };
      })
      .filter((x): x is { item_id: string; quantity: number } => x !== null);

    if (fulfillments.length === 0) {
      setError("출고할 수량을 1개 이상 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await fulfillMaterialRequest({
          request_id: requestId,
          fulfillments,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setAmounts({});
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const totalInput = Object.values(amounts).reduce((s, v) => {
    const n = Number.parseInt(v, 10);
    return s + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  return (
    <div className="rounded bg-card overflow-hidden space-y-0">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b bg-surface-high">
        <div>
          <p className="text-xs font-semibold">출고 처리</p>
          <p className="text-[11px] text-muted-foreground">
            각 자재별 이번 출고 수량을 입력한 뒤 "출고 처리" 버튼을 누르세요.
          </p>
        </div>
        <button
          type="button"
          onClick={setAll}
          disabled={isPending || remainingTotal === 0}
          className="rounded bg-surface-low px-2.5 py-1 text-xs font-medium hover:bg-card"
        >
          남은 수량 전체
        </button>
      </div>

      <div className="grid grid-cols-[1fr_70px_130px_130px] gap-3 px-5 py-2 bg-surface-low text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b">
        <span>품목</span>
        <span>단위</span>
        <span className="text-right">요청 / 출고 / 남음</span>
        <span className="text-right">이번 출고</span>
      </div>

      {items.map((it) => {
        const remaining = it.requested_quantity - it.fulfilled_quantity;
        const isDone = remaining === 0;
        return (
          <div
            key={it.id}
            className="grid grid-cols-[1fr_70px_130px_130px] gap-3 items-center px-5 py-3 border-t"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {it.product_name}
                {it.product_variant && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    · {it.product_variant}
                  </span>
                )}
              </p>
              {it.note && (
                <p className="text-xs text-muted-foreground truncate">{it.note}</p>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{it.unit ?? "—"}</span>
            <span className="text-right text-sm tabular-nums">
              <span>{it.requested_quantity.toLocaleString("ko-KR")}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-muted-foreground">
                {it.fulfilled_quantity.toLocaleString("ko-KR")}
              </span>
              <span className="text-muted-foreground"> / </span>
              <span className={isDone ? "text-emerald-600" : "text-amber-600 font-semibold"}>
                {remaining.toLocaleString("ko-KR")}
              </span>
            </span>
            <div className="flex justify-end">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={remaining}
                placeholder={isDone ? "완료" : "0"}
                value={amounts[it.id] ?? ""}
                onChange={(e) =>
                  setAmounts((prev) => ({ ...prev, [it.id]: e.target.value }))
                }
                disabled={isPending || isDone}
                className="h-9 w-24 rounded border bg-background px-2 text-right text-sm tabular-nums disabled:bg-muted disabled:text-muted-foreground"
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t bg-surface-low">
        <p className="text-xs text-muted-foreground">
          총 입력: <span className="font-semibold tabular-nums">{totalInput.toLocaleString("ko-KR")}</span>
          {" "}· 남은 수량:{" "}
          <span className="font-semibold tabular-nums">{remainingTotal.toLocaleString("ko-KR")}</span>
        </p>
        <Button onClick={handleSubmit} disabled={isPending || totalInput === 0}>
          {isPending ? "처리 중..." : "출고 처리"}
        </Button>
      </div>

      {error && (
        <div className="px-5 py-3 bg-destructive/10">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
