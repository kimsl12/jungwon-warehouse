"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateSite, type SiteFormState } from "@/app/(dashboard)/sites/actions";
import {
  SiteAssigneesPicker,
  type AssigneeCandidate,
} from "@/components/sites/site-assignees-picker";
import { SiteFormFields } from "@/components/sites/site-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Site = {
  id: string;
  name: string;
  address: string | null;
  note: string | null;
  start_date: string | null;
  end_date: string | null;
  assigneeIds: string[];
};

export function SiteEditDialog({
  site,
  assigneeCandidates,
  open,
  onOpenChange,
}: {
  site: Site;
  assigneeCandidates: AssigneeCandidate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<SiteFormState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await updateSite(null, formData);
      if (result?.success) {
        toast.success("현장 정보가 저장되었습니다.");
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
          <DialogTitle>현장 수정</DialogTitle>
          <DialogDescription>{site.name}</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="id" value={site.id} />
          <SiteFormFields
            defaults={site}
            fieldErrors={state?.fieldErrors}
            disabled={isPending}
          />
          <div className="mt-4 border-t pt-4">
            <SiteAssigneesPicker
              candidates={assigneeCandidates}
              initialSelectedIds={site.assigneeIds}
              currentSiteName={site.name}
              disabled={isPending}
            />
          </div>
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
