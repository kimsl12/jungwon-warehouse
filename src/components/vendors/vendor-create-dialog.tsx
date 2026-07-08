"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createVendor, type VendorFormState } from "@/app/(dashboard)/vendors/actions";
import { VendorFormFields } from "@/components/vendors/vendor-form-fields";
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

export function VendorCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VendorFormState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await createVendor(null, formData);
      if (result?.success) {
        toast.success("거래처가 등록되었습니다.");
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
      <DialogTrigger render={<Button />}>거래처 등록</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>새 거래처 등록</DialogTitle>
          <DialogDescription>발주서 작성 시 선택할 거래처를 등록합니다.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <VendorFormFields fieldErrors={state?.fieldErrors} disabled={isPending} />
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
