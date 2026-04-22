import Link from "next/link";
import { notFound } from "next/navigation";

import { MobileTransactionForm } from "@/components/mobile/mobile-transaction-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ product_id?: string }>;

/**
 * Step 2 of mobile flow: pick in/out and enter quantity for the chosen
 * product. Redirects to /m/done on success.
 */
export default async function MobileTransactionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const productId = params.product_id?.trim();
  if (!productId) notFound();

  const supabase = await createClient();
  const [productResult, sitesResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category, unit, variant, quantity, min_quantity, location")
      .eq("id", productId)
      .single(),
    supabase.from("sites").select("id, name").eq("active", true).order("name"),
  ]);

  const { data: product, error } = productResult;
  if (error || !product) notFound();
  const sites = sitesResult.data ?? [];

  const isLow = product.min_quantity > 0 && product.quantity <= product.min_quantity;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/m/scan"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          ← 다른 품목 선택
        </Link>
        <h1 className="mt-2 text-xl font-bold">
          {product.name}
          {product.variant && (
            <span className="ml-2 text-base font-normal text-muted-foreground">· {product.variant}</span>
          )}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {product.category ?? "분류 없음"} · {product.location ?? "위치 미지정"}
        </p>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <p className="text-xs text-muted-foreground">현재 재고</p>
        <p
          className={
            isLow
              ? "mt-1 text-3xl font-bold tabular-nums text-destructive"
              : "mt-1 text-3xl font-bold tabular-nums"
          }
        >
          {product.quantity.toLocaleString("ko-KR")}
          {product.unit && (
            <span className="ml-1 text-base font-normal text-muted-foreground">
              {product.unit}
            </span>
          )}
        </p>
        {isLow && (
          <p className="mt-1 text-xs font-medium text-destructive">
            최소 재고 {product.min_quantity.toLocaleString("ko-KR")} 이하
          </p>
        )}
      </div>

      <MobileTransactionForm
        productId={product.id}
        productName={product.name}
        unit={product.unit}
        currentQuantity={product.quantity}
        sites={sites}
      />
    </div>
  );
}
