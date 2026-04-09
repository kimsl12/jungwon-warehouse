import { InventoryHeader } from "@/components/inventory/inventory-header";
import { InventoryPagination } from "@/components/inventory/inventory-pagination";
import { InventorySearch } from "@/components/inventory/inventory-search";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

type SearchParams = Promise<{
  q?: string;
  category?: string;
  page?: string;
  import?: string;
}>;

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const hasFilter = search.length > 0 || category.length > 0;

  const supabase = await createClient();

  // Search-first mode: no filter → show low-stock only; with filter → RPC search
  const productsResult = hasFilter
    ? await supabase
        .rpc(
          "search_products",
          { p_query: search || undefined, p_category: category || undefined },
          { count: "exact" },
        )
        .range(from, to)
    : await supabase.rpc("get_low_stock_products", undefined, { count: "exact" }).range(from, to);

  // Distinct categories for the filter dropdown
  const [categoriesResult, profileResult, sitesResult] = await Promise.all([
    supabase.from("products").select("category").not("category", "is", null),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      return data;
    }),
    supabase.from("sites").select("id, name").eq("active", true).order("name"),
  ]);

  const products = productsResult.data ?? [];
  const totalCount = productsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isAdmin = profileResult?.role === "admin";

  const categorySet = new Set<string>();
  for (const row of categoriesResult.data ?? []) {
    if (row.category) categorySet.add(row.category);
  }
  const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b, "ko"));

  // Surface import results posted via redirect from /inventory/import
  let importBanner: { inserted: number; updated: number; skipped: number; aliases: number } | null = null;
  if (params.import) {
    const sp = new URLSearchParams(params.import);
    importBanner = {
      inserted: Number(sp.get("inserted") ?? 0),
      updated: Number(sp.get("updated") ?? 0),
      skipped: Number(sp.get("skipped") ?? 0),
      aliases: Number(sp.get("aliases") ?? 0),
    };
  }

  return (
    <div className="space-y-6">
      {importBanner && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          CSV 가져오기 완료 — 신규 {importBanner.inserted.toLocaleString("ko-KR")}건, 업데이트{" "}
          {importBanner.updated.toLocaleString("ko-KR")}건, 건너뜀{" "}
          {importBanner.skipped.toLocaleString("ko-KR")}건
          {importBanner.aliases > 0 && (
            <>, 별칭 {importBanner.aliases.toLocaleString("ko-KR")}건</>
          )}
        </div>
      )}
      <InventoryHeader isAdmin={isAdmin} totalCount={totalCount} />
      <InventorySearch categories={categories} initialSearch={search} initialCategory={category} />

      {!hasFilter && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          제품명, 별칭, 또는 분류를 선택하면 품목이 표시됩니다.
          {totalCount > 0 && (
            <span className="ml-1 font-medium text-destructive">
              현재 재고 부족 품목 {totalCount.toLocaleString("ko-KR")}건을 표시 중입니다.
            </span>
          )}
        </div>
      )}

      <InventoryTable products={products} isAdmin={isAdmin} sites={sitesResult.data ?? []} />
      {hasFilter && <InventoryPagination currentPage={page} totalPages={totalPages} />}
    </div>
  );
}
