"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { History } from "lucide-react";

import { updateProduct, type ProductFormState } from "@/app/(dashboard)/inventory/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductAliases } from "@/components/inventory/product-aliases";
import { ProductFormFields } from "@/components/inventory/product-form-fields";
import { StockAdjustSection } from "@/components/inventory/stock-adjust-section";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function ProductEditDialog({
  product,
  open,
  onOpenChange,
  isAdmin = false,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<ProductFormState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await updateProduct(null, formData);
      if (result?.success) {
        toast.success("품목 정보가 저장되었습니다.");
        onOpenChange(false);
        setState(null);
      } else {
        setState(result);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setState(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>품목 수정</DialogTitle>
          <DialogDescription>
            현재 수량: {product.quantity.toLocaleString("ko-KR")}
            {product.unit ? ` ${product.unit}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="id" value={product.id} />
          <ProductFormFields
            defaults={product}
            fieldErrors={state?.fieldErrors}
            includeQuantity={false}
            disabled={isPending}
          />
          {isAdmin && (
            <div className="mt-4 border-t pt-4">
              <StockAdjustSection
                productId={product.id}
                productName={product.name}
                currentQuantity={product.quantity}
                unit={product.unit}
                onAdjusted={() => {
                  onOpenChange(false);
                  router.refresh();
                }}
              />
            </div>
          )}
          {isAdmin && (
            <div className="mt-4 border-t pt-4">
              <ProductAliases productId={product.id} />
            </div>
          )}
          {isAdmin && (
            <div className="mt-4 border-t pt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                품목 메타정보 변경(이름·분류·위치 등) 이력 확인
              </div>
              <Link
                href={`/activity-log?table=products&record_id=${product.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] text-foreground hover:bg-surface-low"
              >
                <History className="h-3 w-3" /> 변경 이력
              </Link>
            </div>
          )}
          {state?.error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
