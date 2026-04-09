"use client";

import { useState, useTransition } from "react";

import { createSite, type SiteFormState } from "@/app/(dashboard)/sites/actions";
import { SiteFormFields } from "@/components/sites/site-form-fields";
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

export function SiteCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SiteFormState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await createSite(null, formData);
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
      <DialogTrigger render={<Button />}>현장 등록</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 현장 등록</DialogTitle>
          <DialogDescription>출고 처리 시 선택할 현장을 등록합니다.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <SiteFormFields fieldErrors={state?.fieldErrors} disabled={isPending} />
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
