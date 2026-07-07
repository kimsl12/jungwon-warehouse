import { InventoryPagination } from "@/components/inventory/inventory-pagination";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventoryToolbar } from "@/components/inventory/inventory-toolbar";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

type SearchParams = Promise<{
  q?: string;
  category?: string;
  page?: string;
  import?: string;
  inactive?: string;
}>;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 단종(비활성) 포함 보기 — 켜면 검색 경로로 전체 목록 조회
  const includeInactive = params.inactive === "1";
  const hasFilter = search.length > 0 || category.length > 0 || includeInactive;

  const supabase = await createClient();

  const productsResult = hasFilter
    ? await supabase
        .rpc(
          "search_products",
          // p_include_inactive 는 마이그레이션 20260707020000 이후 추가됨 —
          // database.types 재생성 전까지 type-safe 우회.
          {
            p_query: search || undefined,
            p_category: category || undefined,
            p_include_inactive: includeInactive,
          } as never,
          { count: "exact" },
        )
        .range(from, to)
    : await supabase
        .rpc("get_low_stock_products", undefined, { count: "exact" })
        .range(from, to);

  const [categoriesResult, profileResult, sitesResult] = await Promise.all([
    supabase.from("products").select("category").not("category", "is", null),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      return data;
    }),
    supabase.from("sites").select("id, name").eq("active", true).order("name"),
  ]);

  const products = productsResult.data ?? [];
  const totalCount = productsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isAdmin = profileResult?.role === "admin";

  const productIds = products.map((p) => p.id);
  const availabilityMap = new Map<
    string,
    { pending: number; available: number }
  >();
  if (productIds.length > 0) {
    const { data: availability } = await supabase.rpc(
      "get_inventory_availability",
      { p_product_ids: productIds },
    );
    for (const row of availability ?? []) {
      availabilityMap.set(row.product_id, {
        pending: row.pending,
        available: row.available,
      });
    }
  }

  const categorySet = new Set<string>();
  for (const row of categoriesResult.data ?? []) {
    if (row.category) categorySet.add(row.category);
  }
  const categories = Array.from(categorySet).sort((a, b) =>
    a.localeCompare(b, "ko"),
  );

  let importBanner: {
    inserted: number;
    updated: number;
    skipped: number;
    aliases: number;
  } | null = null;
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
    <div className="space-y-5">
      {importBanner && (
        <div className="rounded-md border border-success bg-success-bg px-4 py-3 text-sm text-success">
          CSV 가져오기 완료 — 신규{" "}
          {importBanner.inserted.toLocaleString("ko-KR")}건, 업데이트{" "}
          {importBanner.updated.toLocaleString("ko-KR")}건, 건너뜀{" "}
          {importBanner.skipped.toLocaleString("ko-KR")}건
          {importBanner.aliases > 0 && (
            <>, 별칭 {importBanner.aliases.toLocaleString("ko-KR")}건</>
          )}
        </div>
      )}

      <InventoryToolbar
        categories={categories}
        initialSearch={search}
        initialCategory={category}
        isAdmin={isAdmin}
        initialIncludeInactive={includeInactive}
      />

      {!hasFilter && (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
          제품명·별칭 검색 또는 분류 선택 시 품목이 표시됩니다.
          {totalCount > 0 && (
            <span className="ml-1 font-medium text-warning">
              현재 부족 품목 {totalCount.toLocaleString("ko-KR")}건 표시 중.
            </span>
          )}
        </div>
      )}

      {hasFilter && (
        <InventoryPagination currentPage={page} totalPages={totalPages} />
      )}

      <InventoryTable
        products={products}
        isAdmin={isAdmin}
        sites={sitesResult.data ?? []}
        availabilityMap={Object.fromEntries(availabilityMap)}
      />

      {hasFilter && (
        <InventoryPagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  );
}
