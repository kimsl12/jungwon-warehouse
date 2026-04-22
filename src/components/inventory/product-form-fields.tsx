"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldErrors = Record<string, string[] | undefined>;

export type ProductFormDefaults = {
  name?: string;
  category?: string | null;
  subcategory?: string | null;
  variant?: string | null;
  unit?: string | null;
  quantity?: number;
  min_quantity?: number;
  location?: string | null;
};

/**
 * Shared form fields for product create/edit. Set `includeQuantity={false}`
 * for edit forms — quantity changes must go through process_transaction.
 */
export function ProductFormFields({
  defaults,
  fieldErrors,
  includeQuantity = true,
  disabled = false,
}: {
  defaults?: ProductFormDefaults;
  fieldErrors?: FieldErrors;
  includeQuantity?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <Field
        id="name"
        label="제품명"
        required
        defaultValue={defaults?.name ?? ""}
        error={fieldErrors?.name}
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          id="category"
          label="대분류"
          defaultValue={defaults?.category ?? ""}
          error={fieldErrors?.category}
          disabled={disabled}
          placeholder="예: 강제전선관"
        />
        <Field
          id="subcategory"
          label="소분류"
          defaultValue={defaults?.subcategory ?? ""}
          error={fieldErrors?.subcategory}
          disabled={disabled}
          placeholder="예: ST (강제전선관)"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          id="variant"
          label="변형 (색상·규격)"
          defaultValue={defaults?.variant ?? ""}
          error={fieldErrors?.variant}
          disabled={disabled}
          placeholder="예: 검정, 흰색, 20A"
        />
        <Field
          id="unit"
          label="단위"
          defaultValue={defaults?.unit ?? ""}
          error={fieldErrors?.unit}
          disabled={disabled}
          placeholder="예: 개, 박스, kg"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {includeQuantity && (
          <Field
            id="quantity"
            label="초기 수량"
            type="number"
            min={0}
            required
            defaultValue={defaults?.quantity ?? 0}
            error={fieldErrors?.quantity}
            disabled={disabled}
          />
        )}
        <Field
          id="min_quantity"
          label="최소 재고"
          type="number"
          min={0}
          required
          defaultValue={defaults?.min_quantity ?? 0}
          error={fieldErrors?.min_quantity}
          disabled={disabled}
        />
      </div>
      <Field
        id="location"
        label="보관 위치"
        defaultValue={defaults?.location ?? ""}
        error={fieldErrors?.location}
        disabled={disabled}
        placeholder="예: A-1-3"
      />
      {!includeQuantity && (
        <p className="text-xs text-muted-foreground">
          수량은 입출고 처리를 통해서만 변경할 수 있습니다.
        </p>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  error,
  min,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  error?: string[];
  min?: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
      />
      {error?.[0] && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
