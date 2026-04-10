import { cn } from "@/lib/utils";

/**
 * Renders a "재고 부족" pill if `quantity <= minQuantity` AND `minQuantity > 0`.
 * Returns null otherwise.
 */
export function LowStockBadge({
  quantity,
  minQuantity,
  className,
}: {
  quantity: number;
  minQuantity: number;
  className?: string;
}) {
  if (minQuantity <= 0) return null;
  if (quantity > minQuantity) return null;

  return (
    <span
      data-testid="low-stock-badge"
      className={cn(
        "inline-flex items-center rounded bg-secondary-container/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary",
        className,
      )}
    >
      재고 부족
    </span>
  );
}
