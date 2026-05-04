import { Box, CornerDownRight } from "lucide-react";

import { ProductRowActions } from "@/components/inventory/product-row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { StockBar } from "@/components/shared/stock-bar";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export type SiteOption = { id: string; name: string };

function VariantChip({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {value}
    </span>
  );
}

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
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">등록된 품목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-muted">
            <tr className="text-[10.5px] font-medium uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-2.5 text-left font-medium">품목</th>
              <th className="px-3 py-2.5 text-left font-medium">분류</th>
              <th className="px-3 py-2.5 text-left font-medium">위치</th>
              <th className="px-3 py-2.5 text-right font-medium">재고</th>
              <th className="px-3 py-2.5 text-right font-medium">최소</th>
              <th className="px-3 py-2.5 text-right font-medium">가용</th>
              <th className="px-3 py-2.5 text-left font-medium">상태</th>
              <th className="px-3 py-2.5 text-right font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const status =
                p.quantity === 0
                  ? { tone: "danger" as const, label: "소진" }
                  : p.quantity <= p.min_quantity
                    ? { tone: "warning" as const, label: "부족" }
                    : { tone: "success" as const, label: "정상" };
              const availability = availabilityMap?.[p.id];
              const showPending = availability && availability.pending > 0;

              const isFirstOfGroup =
                i === 0 || products[i - 1].name !== p.name;

              return (
                <tr
                  key={p.id}
                  className={
                    "transition-colors hover:bg-muted/40 " +
                    (isFirstOfGroup ? "border-t border-border" : "")
                  }
                >
                  <td className="px-5 py-3">
                    {isFirstOfGroup ? (
                      <div className="flex items-center gap-3">
                        <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-brand-600 dark:text-brand-300">
                          <Box className="size-4" />
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {p.name}
                          </span>
                          <VariantChip value={p.variant} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pl-12">
                        <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                        <VariantChip value={p.variant} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {p.category ?? "—"}
                    {p.subcategory && (
                      <span className="text-[11px]"> / {p.subcategory}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                    {p.location ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums">
                        {p.quantity.toLocaleString("ko-KR")}
                        {p.unit && (
                          <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                            {p.unit}
                          </span>
                        )}
                      </span>
                      <StockBar
                        current={p.quantity}
                        safe={p.min_quantity}
                        showLabel={false}
                        className="w-20"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {p.min_quantity.toLocaleString("ko-KR")}
                    {p.unit && <span className="ml-0.5 text-[11px]">{p.unit}</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {showPending ? (
                      <div className="leading-tight">
                        <div className="font-semibold text-warning">
                          {availability!.available.toLocaleString("ko-KR")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          대기 {availability!.pending.toLocaleString("ko-KR")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {(availability?.available ?? p.quantity).toLocaleString("ko-KR")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={status.tone} dot>
                      {status.label}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <ProductRowActions
                      product={p}
                      isAdmin={isAdmin}
                      sites={sites}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
