import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Component: queries products where quantity <= min_quantity and
 * min_quantity > 0, then renders a global warning banner if any are below
 * threshold. Returns null when nothing is low.
 *
 * Mounted in the dashboard layout so it shows on every authenticated page.
 */
export async function LowStockBanner() {
  const supabase = await createClient();

  // PostgREST can't compare two columns server-side without an RPC, so we
  // pull rows where min_quantity > 0 and filter in JS. This stays cheap as
  // long as the inventory has reasonable cardinality (≪ 10k).
  const { data } = await supabase
    .from("products")
    .select("id, name, quantity, min_quantity, unit")
    .gt("min_quantity", 0)
    .order("name");

  const lowStock = (data ?? []).filter((p) => p.quantity <= p.min_quantity);

  if (lowStock.length === 0) return null;

  const preview = lowStock.slice(0, 3);
  const remainder = lowStock.length - preview.length;

  return (
    <div
      data-testid="low-stock-banner"
      className="border-b border-destructive/30 bg-destructive/10"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <span className="inline-flex items-center rounded bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
          재고 부족 {lowStock.length}건
        </span>
        <span className="text-destructive">
          {preview.map((p, i) => (
            <span key={p.id}>
              {i > 0 && <span className="text-destructive/60"> · </span>}
              <span className="font-medium">{p.name}</span>
              <span className="ml-1 text-xs text-destructive/80">
                ({p.quantity.toLocaleString("ko-KR")}
                {p.unit ?? ""} / 최소 {p.min_quantity.toLocaleString("ko-KR")}
                {p.unit ?? ""})
              </span>
            </span>
          ))}
          {remainder > 0 && (
            <span className="ml-1 text-xs text-destructive/80">외 {remainder}건</span>
          )}
        </span>
        <Link
          href="/overview"
          className="ml-auto text-xs font-medium text-destructive underline underline-offset-2 hover:no-underline"
        >
          전체 보기 →
        </Link>
      </div>
    </div>
  );
}
