"use client";

import { useEffect, useState, useTransition } from "react";

import {
  processTransaction,
  type ProcessTransactionState,
} from "@/app/(dashboard)/inventory/transaction-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type SiteOption = { id: string; name: string };

export function ProcessTransactionDialog({
  product,
  open,
  onOpenChange,
  sites,
  initialType = "in",
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: SiteOption[];
  initialType?: "in" | "out" | "loss";
}) {
  const [type, setType] = useState<"in" | "out" | "loss">(initialType);
  const [siteId, setSiteId] = useState<string>("");
  const [state, setState] = useState<ProcessTransactionState>(null);
  const [isPending, startTransition] = useTransition();

  // When the dialog re-opens after a prior close, reset the type to the
  // caller-supplied initialType. Otherwise a user who opens 출고 처리 once,
  // closes, then opens 입고 처리 would keep seeing out.
  useEffect(() => {
    if (open) setType(initialType);
  }, [open, initialType]);

  function handleSubmit(formData: FormData) {
    setState(null);
    formData.set("type", type);
    formData.set("site_id", siteId);
    startTransition(async () => {
      const result = await processTransaction(null, formData);
      setState(result);
      // Keep the dialog open on success briefly so user sees the new quantity
      // before next action — close on explicit dismiss.
      if (result?.success) {
        // Auto-close after a short delay so the success state is visible
        setTimeout(() => {
          onOpenChange(false);
          setState(null);
        }, 1500);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setState(null);
      setType(initialType);
      setSiteId("");
    }
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>입출고 처리</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">
              {product.name}
              {product.variant && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">· {product.variant}</span>
              )}
            </span>
            {" · 현재 "}
            {product.quantity.toLocaleString("ko-KR")}
            {product.unit ? ` ${product.unit}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="product_id" value={product.id} />

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>구분</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType("in")}
                  disabled={isPending}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-sm font-medium transition",
                    type === "in"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  입고
                </button>
                <button
                  type="button"
                  onClick={() => setType("out")}
                  disabled={isPending}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-sm font-medium transition",
                    type === "out"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  출고
                </button>
                <button
                  type="button"
                  onClick={() => setType("loss")}
                  disabled={isPending}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-sm font-medium transition",
                    type === "loss"
                      ? "border-warning bg-warning-bg text-warning"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  분실
                </button>
              </div>
              {type === "loss" && (
                <p className="text-[11px] text-muted-foreground">
                  분실은 출고와 분리되어 통계에서 별도 손실로 집계됩니다. 현장은
                  옵셔널입니다.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quantity">
                수량 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                required
                disabled={isPending}
                aria-invalid={state?.fieldErrors?.quantity ? true : undefined}
              />
              {state?.fieldErrors?.quantity?.[0] && (
                <p className="text-xs text-destructive">{state.fieldErrors.quantity[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site">
                현장{" "}
                {type === "out" && <span className="text-destructive">*</span>}
                {type !== "out" && (
                  <span className="text-xs text-muted-foreground">(선택)</span>
                )}
              </Label>
              <select
                id="site"
                className={selectClass}
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                disabled={isPending}
                required={type === "out"}
                aria-invalid={state?.fieldErrors?.site_id ? true : undefined}
              >
                <option value="">— 선택 —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {state?.fieldErrors?.site_id?.[0] && (
                <p className="text-xs text-destructive">{state.fieldErrors.site_id[0]}</p>
              )}
              {sites.length === 0 && (
                <p className="text-xs text-warning dark:text-amber-400">
                  등록된 현장이 없습니다. 관리자에게 현장 등록을 요청하세요.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">메모 (선택)</Label>
              <Input id="note" name="note" type="text" maxLength={500} disabled={isPending} />
            </div>
          </div>

          {state?.error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          {state?.success && (
            <div className="mt-3 rounded-md border border-emerald-200 bg-success-bg p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
              <p className="font-medium text-success dark:text-emerald-300">
                처리 완료 · 새 수량 {state.newQuantity?.toLocaleString("ko-KR")}
              </p>
              {state.lowStock && (
                <p className="mt-1 text-xs text-destructive">
                  ⚠ 최소 재고 이하입니다. 추가 입고가 필요합니다.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              닫기
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "처리 중..." : "처리"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
