"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createRequestTemplate } from "@/app/(mobile)/m/request/templates/actions";
import {
  TemplateForm,
  type TemplateFormValues,
} from "@/components/requests/template-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TemplateCreateDialog({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(null);
  }

  function handleSubmit(values: TemplateFormValues) {
    setError(null);
    if (values.name.trim().length === 0) {
      setError("템플릿 이름을 입력해주세요.");
      return;
    }
    if (values.lines.length === 0) {
      setError("최소 1개 이상의 자재를 추가해주세요.");
      return;
    }
    startTransition(async () => {
      const result = await createRequestTemplate({
        name: values.name.trim(),
        note: values.note.trim() ? values.note.trim() : null,
        is_public: values.isPublic,
        category: values.isPublic ? values.category.trim() || null : null,
        subcategory: values.isPublic ? values.subcategory.trim() || null : null,
        variables:
          values.isPublic && values.variables.length > 0
            ? values.variables
            : null,
        items: values.lines.map((l) => ({
          product_id: l.product_id,
          requested_quantity:
            l.formula !== null && l.formula.length > 0
              ? null
              : (l.requested_quantity ?? 0),
          formula:
            l.formula !== null && l.formula.length > 0 ? l.formula : null,
          note: null,
        })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" /> 새 템플릿
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>새 자재 신청 템플릿</DialogTitle>
          <DialogDescription>
            현장에서 자주 신청하는 자재 묶음을 미리 만들어두면 신청 작성이
            빨라집니다. 공용 템플릿(관리자 전용)에는 변수와 산출 수식을 등록할
            수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <TemplateForm
            isPending={isPending}
            isAdmin={isAdmin}
            submitLabel="저장"
            pendingLabel="저장 중..."
            error={error}
            onCancel={() => handleOpenChange(false)}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
