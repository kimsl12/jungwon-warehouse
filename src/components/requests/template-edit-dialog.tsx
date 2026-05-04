"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateRequestTemplate } from "@/app/(mobile)/m/request/templates/actions";
import {
  TemplateForm,
  type TemplateFormLine,
  type TemplateFormValues,
  type TemplateVariableInput,
} from "@/components/requests/template-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type EditTemplate = {
  id: string;
  name: string;
  note: string | null;
  is_public: boolean;
  category: string | null;
  subcategory: string | null;
  variables: TemplateVariableInput[] | null;
  items: Array<{
    product_id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    requested_quantity: number | null;
    formula: string | null;
  }>;
};

type Props = {
  template: EditTemplate | null;
  isAdmin: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TemplateEditDialog({ template, isAdmin, onOpenChange }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit(values: TemplateFormValues) {
    if (!template) return;
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
      const result = await updateRequestTemplate({
        id: template.id,
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
      close();
      router.refresh();
    });
  }

  const open = template !== null;

  const initialLines: TemplateFormLine[] = template
    ? template.items.map((it) => ({
        product_id: it.product_id,
        name: it.name,
        variant: it.variant,
        unit: it.unit,
        requested_quantity: it.requested_quantity,
        formula: it.formula,
      }))
    : [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>템플릿 수정</DialogTitle>
          <DialogDescription>
            이름·메모·공개 범위·대/소분류·변수·자재 구성을 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {template && (
          <TemplateForm
            initialValues={{
              name: template.name,
              note: template.note ?? "",
              isPublic: template.is_public,
              category: template.category ?? "",
              subcategory: template.subcategory ?? "",
              variables: template.variables ?? [],
              lines: initialLines,
            }}
            isPending={isPending}
            isAdmin={isAdmin}
            submitLabel="수정"
            pendingLabel="수정 중..."
            error={error}
            onCancel={close}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
