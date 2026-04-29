"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateRequestTemplate } from "@/app/(mobile)/m/request/templates/actions";
import {
  TemplateForm,
  type TemplateFormValues,
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
  items: Array<{
    product_id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    requested_quantity: number;
  }>;
};

type Props = {
  template: EditTemplate | null;
  onOpenChange: (open: boolean) => void;
};

export function TemplateEditDialog({ template, onOpenChange }: Props) {
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
        items: values.lines.map((l) => ({
          product_id: l.product_id,
          requested_quantity: l.requested_quantity,
          note: null,
        })),
        is_public: values.isPublic,
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

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>템플릿 수정</DialogTitle>
          <DialogDescription>
            이름·메모·공개 범위·자재 구성을 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {template && (
          <TemplateForm
            initialValues={{
              name: template.name,
              note: template.note ?? "",
              isPublic: template.is_public,
              lines: template.items.map((it) => ({
                product_id: it.product_id,
                name: it.name,
                variant: it.variant,
                unit: it.unit,
                requested_quantity: it.requested_quantity,
              })),
            }}
            isPending={isPending}
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
