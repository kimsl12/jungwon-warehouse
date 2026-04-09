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

  const supabase = await createClient();

  // Build the products query
  let productsQuery = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  if (search) {
    productsQuery = productsQuery.ilike("name", `%${search}%`);
  }
  if (category) {
    productsQuery = productsQuery.eq("category", category);
  }

  // Distinct categories for the filter dropdown — fetched once per request
  const [productsResult, categoriesResult, profileResult, sitesResult] = await Promise.all([
    productsQuery,
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
  let importBanner: { inserted: number; updated: number; skipped: number } | null = null;
  if (params.import) {
    const sp = new URLSearchParams(params.import);
    importBanner = {
      inserted: Number(sp.get("inserted") ?? 0),
      updated: Number(sp.get("updated") ?? 0),
      skipped: Number(sp.get("skipped") ?? 0),
    };
  }

  return (
    <div className="space-y-6">
      {importBanner && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          CSV 가져오기 완료 — 신규 {importBanner.inserted.toLocaleString("ko-KR")}건, 업데이트{" "}
          {importBanner.updated.toLocaleString("ko-KR")}건, 건너뜀{" "}
          {importBanner.skipped.toLocaleString("ko-KR")}건
        </div>
      )}
      <InventoryHeader isAdmin={isAdmin} totalCount={totalCount} />
      <InventorySearch categories={categories} initialSearch={search} initialCategory={category} />
      <InventoryTable products={products} isAdmin={isAdmin} sites={sitesResult.data ?? []} />
      <InventoryPagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}
