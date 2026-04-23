"use client";

import { useState, useTransition } from "react";

import { updateVendor, type VendorFormState } from "@/app/(dashboard)/vendors/actions";
import { VendorFormFields } from "@/components/vendors/vendor-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Vendor = {
  id: string;
  name: string;
  ceo: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  fax: string | null;
  email: string | null;
  address: string | null;
  business_number: string | null;
  note: string | null;
};

export function VendorEditDialog({
  vendor,
  open,
  onOpenChange,
}: {
  vendor: Vendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<VendorFormState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await updateVendor(null, formData);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>거래처 수정</DialogTitle>
          <DialogDescription>{vendor.name}</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="id" value={vendor.id} />
          <VendorFormFields
            defaults={vendor}
            fieldErrors={state?.fieldErrors}
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
