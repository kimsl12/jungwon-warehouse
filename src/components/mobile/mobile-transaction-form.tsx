"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { processTransaction } from "@/app/(dashboard)/inventory/transaction-actions";
import { Button } from "@/components/ui/button";

type SiteOption = { id: string; name: string };

/**
 * Mobile in/out form. Reuses the dashboard's processTransaction server
 * action so logic and validation stay identical.
 *
 * On success: redirect to /m/done?type=...&qty=...&new=...&name=...
 * — the success page reads from search params and shows a confirmation.
 */
export function MobileTransactionForm({
  productId,
  productName,
  unit,
  currentQuantity,
  sites,
}: {
  productId: string;
  productName: string;
  unit: string | null;
  currentQuantity: number;
  sites: SiteOption[];
}) {
  const router = useRouter();
  const [type, setType] = useState<"in" | "out">("out");
  const [siteId, setSiteId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const qtyNum = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError("수량은 1 이상이어야 합니다.");
      return;
    }
    if (type === "out" && qtyNum > currentQuantity) {
      setError(
        `재고가 부족합니다. 현재 ${currentQuantity.toLocaleString("ko-KR")}${unit ?? ""}`,
      );
      return;
    }
    if (type === "out" && !siteId) {
      setError("출고는 현장을 선택해주세요.");
      return;
    }

    const fd = new FormData();
    fd.append("product_id", productId);
    fd.append("type", type);
    fd.append("quantity", String(qtyNum));
    if (note.trim()) fd.append("note", note.trim());
    if (siteId) fd.append("site_id", siteId);

    startTransition(async () => {
      const result = await processTransaction(null, fd);
      if (result?.success) {
        const params = new URLSearchParams({
          type,
          qty: String(qtyNum),
          new: String(result.newQuantity ?? ""),
          name: productName,
          unit: unit ?? "",
          low: result.lowStock ? "1" : "0",
        });
        router.push(`/m/done?${params.toString()}`);
      } else {
        setError(result?.error ?? "처리 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">처리 구분</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("out")}
            className={
              type === "out"
                ? "h-12 rounded-md border-2 border-warning bg-warning-bg font-semibold text-warning dark:bg-amber-950 dark:text-amber-300"
                : "h-12 rounded-md border bg-background text-muted-foreground"
            }
          >
            출고
          </button>
          <button
            type="button"
            onClick={() => setType("in")}
            className={
              type === "in"
                ? "h-12 rounded-md border-2 border-success bg-success-bg font-semibold text-success dark:bg-emerald-950 dark:text-emerald-300"
                : "h-12 rounded-md border bg-background text-muted-foreground"
            }
          >
            입고
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="qty" className="mb-2 block text-sm font-medium">
          수량 {unit && <span className="text-xs text-muted-foreground">({unit})</span>}
        </label>
        <input
          id="qty"
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
          className="h-12 w-full rounded-md border bg-background px-3 text-2xl font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="site" className="mb-2 block text-sm font-medium">
          현장{" "}
          {type === "out" ? (
            <span className="text-destructive">*</span>
          ) : (
            <span className="text-xs text-muted-foreground">(선택)</span>
          )}
        </label>
        <select
          id="site"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          required={type === "out"}
          className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— 선택 —</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {sites.length === 0 && (
          <p className="mt-1 text-xs text-warning dark:text-amber-400">
            등록된 현장이 없습니다. 관리자에게 요청하세요.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="note" className="mb-2 block text-sm font-medium">
          메모 <span className="text-xs text-muted-foreground">(선택)</span>
        </label>
        <input
          id="note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: A 현장 출고"
          className="h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending || !quantity}
        className="h-12 w-full text-base font-semibold"
      >
        {isPending ? "처리 중..." : `${type === "in" ? "입고" : "출고"} 확정`}
      </Button>
    </form>
  );
}
