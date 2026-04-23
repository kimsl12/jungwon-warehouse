import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldErrors = Record<string, string[] | undefined> | undefined;

export type VendorFormDefaults = {
  name?: string | null;
  ceo?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  fax?: string | null;
  email?: string | null;
  address?: string | null;
  business_number?: string | null;
  note?: string | null;
};

export function VendorFormFields({
  defaults,
  fieldErrors,
  disabled,
}: {
  defaults?: VendorFormDefaults;
  fieldErrors?: FieldErrors;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <Field
        id="vendor-name"
        name="name"
        label="상호"
        required
        defaultValue={defaults?.name}
        error={fieldErrors?.name}
        disabled={disabled}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="vendor-ceo"
          name="ceo"
          label="대표자명 (선택)"
          defaultValue={defaults?.ceo}
          disabled={disabled}
        />
        <Field
          id="vendor-biznum"
          name="business_number"
          label="사업자등록번호 (선택)"
          defaultValue={defaults?.business_number}
          disabled={disabled}
          placeholder="000-00-00000"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="vendor-contact-person"
          name="contact_person"
          label="담당자명 (선택)"
          defaultValue={defaults?.contact_person}
          disabled={disabled}
        />
        <Field
          id="vendor-contact-phone"
          name="contact_phone"
          label="담당자 연락처 (선택)"
          defaultValue={defaults?.contact_phone}
          disabled={disabled}
          placeholder="010-0000-0000"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="vendor-fax"
          name="fax"
          label="팩스번호 (선택)"
          defaultValue={defaults?.fax}
          disabled={disabled}
          placeholder="02-0000-0000"
        />
        <Field
          id="vendor-email"
          name="email"
          label="이메일 (선택)"
          type="email"
          defaultValue={defaults?.email}
          disabled={disabled}
        />
      </div>

      <Field
        id="vendor-address"
        name="address"
        label="주소 (선택)"
        defaultValue={defaults?.address}
        disabled={disabled}
      />

      <Field
        id="vendor-note"
        name="note"
        label="비고 (선택 — 취급 품목 등)"
        defaultValue={defaults?.note}
        disabled={disabled}
        maxLength={500}
      />
    </div>
  );
}

function Field({
  id,
  name,
  label,
  required = false,
  defaultValue,
  placeholder,
  error,
  disabled,
  type = "text",
  maxLength,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  placeholder?: string;
  error?: string[];
  disabled?: boolean;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
      />
      {error?.[0] && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
