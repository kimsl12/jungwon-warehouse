import { MobileProductSearch } from "@/components/mobile/mobile-product-search";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

/**
 * Step 1 of mobile flow: pick a product.
 *
 * Uses a debounced search box (client side) → Server Component re-fetches
 * via URL param. Tap a row to advance to /m/transaction?product_id=...
 */
export default async function MobileScanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const supabase = await createClient();

  // Uses search_products RPC to search product name + aliases
  const { data } = await supabase
    .rpc("search_products", { p_query: q || undefined, p_category: undefined })
    .select("id, name, category, unit, quantity, min_quantity, location")
    .limit(50);
  const products = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">품목 선택</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          입출고 처리할 품목을 검색해서 선택하세요.
        </p>
      </div>

      <MobileProductSearch initialQuery={q} />

      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
            {q ? "검색 결과가 없습니다." : "품목이 없습니다."}
          </p>
        ) : (
          products.map((p) => {
            const isLow = p.min_quantity > 0 && p.quantity <= p.min_quantity;
            return (
              <a
                key={p.id}
                href={`/m/transaction?product_id=${p.id}`}
                className="block min-h-[64px] rounded-md border bg-background p-3 active:bg-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.category ?? "분류 없음"} · {p.location ?? "위치 미지정"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        isLow
                          ? "text-base font-semibold tabular-nums text-destructive"
                          : "text-base font-semibold tabular-nums"
                      }
                    >
                      {p.quantity.toLocaleString("ko-KR")}
                      {p.unit && (
                        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                          {p.unit}
                        </span>
                      )}
                    </p>
                    {isLow && (
                      <p className="text-[10px] font-medium text-destructive">재고 부족</p>
                    )}
                  </div>
                </div>
              </a>
            );
          })
        )}
        {products.length === 50 && (
          <p className="px-1 py-2 text-center text-xs text-muted-foreground">
            상위 50건만 표시 — 더 정확한 검색어를 입력하세요
          </p>
        )}
      </div>
    </div>
  );
}
