import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldErrors = Record<string, string[] | undefined> | undefined;

export type SiteFormDefaults = {
  name?: string | null;
  address?: string | null;
  note?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export function SiteFormFields({
  defaults,
  fieldErrors,
  disabled,
}: {
  defaults?: SiteFormDefaults;
  fieldErrors?: FieldErrors;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="site-name">
          현장명 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="site-name"
          name="name"
          type="text"
          required
          maxLength={100}
          defaultValue={defaults?.name ?? ""}
          disabled={disabled}
          aria-invalid={fieldErrors?.name ? true : undefined}
        />
        {fieldErrors?.name?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="site-start-date">착공일 (선택)</Label>
          <Input
            id="site-start-date"
            name="start_date"
            type="date"
            defaultValue={defaults?.start_date ?? ""}
            disabled={disabled}
            aria-invalid={fieldErrors?.start_date ? true : undefined}
          />
          {fieldErrors?.start_date?.[0] && (
            <p className="text-xs text-destructive">
              {fieldErrors.start_date[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="site-end-date">준공일 (선택)</Label>
          <Input
            id="site-end-date"
            name="end_date"
            type="date"
            defaultValue={defaults?.end_date ?? ""}
            disabled={disabled}
            aria-invalid={fieldErrors?.end_date ? true : undefined}
          />
          {fieldErrors?.end_date?.[0] && (
            <p className="text-xs text-destructive">
              {fieldErrors.end_date[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site-address">주소 (선택)</Label>
        <Input
          id="site-address"
          name="address"
          type="text"
          maxLength={200}
          defaultValue={defaults?.address ?? ""}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site-note">메모 (선택)</Label>
        <Input
          id="site-note"
          name="note"
          type="text"
          maxLength={500}
          defaultValue={defaults?.note ?? ""}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
