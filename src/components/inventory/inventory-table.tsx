import { LowStockBadge } from "@/components/inventory/low-stock-badge";
import { ProductRowActions } from "@/components/inventory/product-row-actions";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export type SiteOption = { id: string; name: string };

const GRID_COLS = "grid-cols-[1fr_110px_110px_120px_90px_90px_70px_110px]";

export function InventoryTable({
  products,
  isAdmin,
  sites,
  availabilityMap,
}: {
  products: Product[];
  isAdmin: boolean;
  sites: SiteOption[];
  availabilityMap?: Record<string, { pending: number; available: number }>;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">등록된 품목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded bg-card overflow-hidden">
      {/* Header row */}
      <div className={`grid ${GRID_COLS} gap-2 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`}>
        <span>품목명</span>
        <span>대분류</span>
        <span>소분류</span>
        <span>변형 (색상·규격)</span>
        <span className="text-right">재고</span>
        <span className="text-right">가용 (대기 제외)</span>
        <span className="text-right">최소</span>
        <span className="text-right">작업</span>
      </div>
      {/* Rows */}
      {products.map((product) => (
        <div
          key={product.id}
          className={`grid ${GRID_COLS} gap-2 items-center px-5 py-3 hover:bg-surface-low/50 transition-colors`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate" title={product.name}>{product.name}</span>
            <LowStockBadge quantity={product.quantity} minQuantity={product.min_quantity} />
          </div>
          <span className="text-sm text-muted-foreground truncate">{product.category ?? "—"}</span>
          <span className="text-xs text-muted-foreground truncate">{product.subcategory ?? "—"}</span>
          <span
            className={
              product.variant
                ? "inline-flex w-fit items-center rounded bg-surface-high px-2 py-0.5 text-xs font-medium text-foreground truncate"
                : "text-xs text-muted-foreground/60"
            }
            title={product.variant ?? undefined}
          >
            {product.variant ?? "—"}
          </span>
          <span className="text-right text-sm tabular-nums font-semibold">
            {product.quantity.toLocaleString("ko-KR")}
            {product.unit && (
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">{product.unit}</span>
            )}
          </span>
          <span className="text-right text-sm tabular-nums">
            {(() => {
              const availability = availabilityMap?.[product.id];
              if (!availability) {
                return (
                  <span className="text-muted-foreground">
                    {product.quantity.toLocaleString("ko-KR")}
                  </span>
                );
              }
              const warn = availability.pending > 0;
              return (
                <span className="inline-flex flex-col items-end leading-tight">
                  <span className={warn ? "font-semibold text-amber-700" : ""}>
                    {availability.available.toLocaleString("ko-KR")}
                  </span>
                  {warn && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      대기 {availability.pending.toLocaleString("ko-KR")}
                    </span>
                  )}
                </span>
              );
            })()}
          </span>
          <span className="text-right text-sm tabular-nums text-muted-foreground">
            {product.min_quantity.toLocaleString("ko-KR")}
          </span>
          <div className="flex justify-end">
            <ProductRowActions product={product} isAdmin={isAdmin} sites={sites} />
          </div>
        </div>
      ))}
    </div>
  );
}
