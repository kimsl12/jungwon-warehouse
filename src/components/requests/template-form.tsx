"use client";

import { X } from "lucide-react";
import { useState } from "react";

import {
  TemplateProductPicker,
  type PickerProduct,
} from "@/components/requests/template-product-picker";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

export type TemplateFormLine = {
  product_id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  requested_quantity: number;
};

export type TemplateFormValues = {
  name: string;
  note: string;
  isPublic: boolean;
  lines: TemplateFormLine[];
};

const DEFAULT_VALUES: TemplateFormValues = {
  name: "",
  note: "",
  isPublic: true,
  lines: [],
};

type Props = {
  initialValues?: TemplateFormValues;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: TemplateFormValues) => void;
};

export function TemplateForm({
  initialValues = DEFAULT_VALUES,
  isPending,
  submitLabel,
  pendingLabel,
  error,
  onCancel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialValues.name);
  const [note, setNote] = useState(initialValues.note);
  const [isPublic, setIsPublic] = useState(initialValues.isPublic);
  const [lines, setLines] = useState<TemplateFormLine[]>(initialValues.lines);

  function addProduct(p: PickerProduct) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.product_id === p.id
            ? { ...l, requested_quantity: l.requested_quantity + 1 }
            : l,
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          variant: p.variant,
          unit: p.unit,
          requested_quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(product_id: string, quantity: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.product_id === product_id
          ? { ...l, requested_quantity: Math.max(1, quantity) }
          : l,
      ),
    );
  }

  function removeLine(product_id: string) {
    setLines((prev) => prev.filter((l) => l.product_id !== product_id));
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            이름 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
            placeholder="예: 아파트 신축 공용부 전선 세트"
            disabled={isPending}
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            메모
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
            placeholder="선택 사항"
            disabled={isPending}
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            공개 범위
          </label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                isPublic
                  ? "border-secondary bg-secondary/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-surface-low"
              }`}
              disabled={isPending}
            >
              공용 (전체 현장 공유)
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                !isPublic
                  ? "border-secondary bg-secondary/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-surface-low"
              }`}
              disabled={isPending}
            >
              개인 (본인만)
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            자재 <span className="text-destructive">*</span>
          </label>
          <div className="mt-1">
            <TemplateProductPicker onPick={addProduct} disabled={isPending} />
          </div>

          {lines.length > 0 && (
            <ul className="mt-3 space-y-2 rounded border p-2">
              {lines.map((l) => (
                <li
                  key={l.product_id}
                  className="flex items-center gap-2 rounded bg-surface-low px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {l.name}
                      {l.variant && (
                        <span className="ml-1 text-muted-foreground">· {l.variant}</span>
                      )}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={l.requested_quantity}
                    onChange={(e) =>
                      updateQuantity(l.product_id, Number(e.target.value) || 1)
                    }
                    className="w-20 rounded border bg-background px-2 py-1 text-right text-sm tabular-nums"
                    disabled={isPending}
                  />
                  <span className="w-8 text-xs text-muted-foreground">
                    {l.unit ?? ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(l.product_id)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="삭제"
                    disabled={isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {lines.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              위 검색창에서 자재를 찾아 클릭하면 목록에 추가됩니다.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          취소
        </Button>
        <Button
          type="button"
          onClick={() => onSubmit({ name, note, isPublic, lines })}
          disabled={isPending}
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
