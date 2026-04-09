"use client";

import { useState, useTransition } from "react";

import { createProduct, type ProductFormState } from "@/app/(dashboard)/inventory/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductFormFields } from "@/components/inventory/product-form-fields";

export function ProductCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ProductFormState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await createProduct(null, formData);
      if (result?.success) {
        setOpen(false);
        setState(null);
      } else {
        setState(result);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setState(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>품목 등록</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 품목 등록</DialogTitle>
          <DialogDescription>품목 정보를 입력해주세요.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <ProductFormFields fieldErrors={state?.fieldErrors} disabled={isPending} />
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
              {isPending ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
