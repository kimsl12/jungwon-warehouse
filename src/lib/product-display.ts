/**
 * Combine a product's name with its variant for display.
 * Returns just the name when variant is empty/null.
 */
export function productDisplayName(
  name: string | null | undefined,
  variant: string | null | undefined,
): string {
  const base = name ?? "-";
  const v = variant?.trim();
  return v ? `${base} · ${v}` : base;
}
