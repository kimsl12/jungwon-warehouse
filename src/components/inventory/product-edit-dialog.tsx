"use client";

import { useState, useTransition } from "react";

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
import { ProductFormFields } from "@/components/inventory/product-form-fields";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function ProductEditDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<ProductFormState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await updateProduct(null, formData);
      if (result?.success) {
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
