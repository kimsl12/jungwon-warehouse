import { LowStockBadge } from "@/components/inventory/low-stock-badge";
import { ProductRowActions } from "@/components/inventory/product-row-actions";
import type { Database } from "@/lib/database.types";
import { productDisplayName } from "@/lib/product-display";

type Product = Database["public"]["Tables"]["products"]["Row"];

export type SiteOption = { id: string; name: string };

export function InventoryTable({
  products,
  isAdmin,
  sites,
}: {
  products: Product[];
  isAdmin: boolean;
  sites: SiteOption[];
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
      <div className="grid grid-cols-[1fr_140px_140px_80px_80px_120px] gap-2 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span>품목명</span>
        <span>대분류</span>
        <span>소분류</span>
        <span className="text-right">수량</span>
        <span className="text-right">최소</span>
        <span className="text-right">작업</span>
      </div>
      {/* Rows */}
      {products.map((product) => (
        <div
          key={product.id}
          className="grid grid-cols-[1fr_140px_140px_80px_80px_120px] gap-2 items-center px-5 py-3 hover:bg-surface-low/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate" title={productDisplayName(product.name, product.variant)}>
              {product.name}
              {product.variant && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {product.variant}</span>
              )}
            </span>
            <LowStockBadge quantity={product.quantity} minQuantity={product.min_quantity} />
          </div>
          <span className="text-sm text-muted-foreground truncate">{product.category ?? "-"}</span>
          <span className="text-xs text-muted-foreground truncate">{product.subcategory ?? "-"}</span>
          <span className="text-right text-sm tabular-nums font-semibold">
            {product.quantity.toLocaleString("ko-KR")}
            {product.unit && (
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">{product.unit}</span>
            )}
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
