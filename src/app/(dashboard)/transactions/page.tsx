import Link from "next/link";

import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { TransactionsPagination } from "@/components/transactions/transactions-pagination";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 30;

type SearchParams = Promise<{
  type?: "in" | "out" | "loss";
  product_id?: string;
  user_id?: string;
  category?: string;
  site_id?: string;
  vendor_id?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = currentUser
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single()
    : { data: null };
  const isAdmin = currentProfile?.role === "admin";

  // Build the transactions query. We embed `products` (FK on transactions
  // → products) but resolve `profiles` separately because the FK on
  // transactions.created_by points to auth.users, not profiles.
  let query = supabase
    .from("transactions")
    .select(
      `
      id,
      type,
      quantity,
      note,
      created_at,
      created_by,
      site_id,
      vendor_id,
      canceled_at,
      related_tx_id,
      products!inner(id, name, category, unit, variant),
      sites(id, name),
      vendors(id, name)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (params.type === "in" || params.type === "out" || params.type === "loss") {
    query = query.eq("type", params.type);
  }
  if (params.product_id) {
    query = query.eq("product_id", params.product_id);
  }
  if (params.user_id) {
    query = query.eq("created_by", params.user_id);
  }
  if (params.category) {
    query = query.eq("products.category", params.category);
  }
  if (params.site_id) {
    query = query.eq("site_id", params.site_id);
  }
  if (params.vendor_id) {
    query = query.eq("vendor_id", params.vendor_id);
  }
  if (params.from) {
    query = query.gte("created_at", params.from);
  }
  if (params.to) {
    // include the entire end day
    const endOfDay = new Date(params.to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  // Fetch dropdown options in parallel
  const [
    transactionsResult,
    productsResult,
    categoriesResult,
    profilesResult,
    sitesResult,
    vendorsResult,
  ] = await Promise.all([
    query,
    supabase.from("products").select("id, name").order("name"),
    supabase.from("products").select("category").not("category", "is", null),
    supabase.from("profiles").select("id, name").order("name"),
    supabase.from("sites").select("id, name").eq("active", true).order("name"),
    supabase
      .from("vendors")
      .select("id, name")
      .eq("active", true)
      .order("name"),
  ]);

  const transactions = transactionsResult.data ?? [];
  const totalCount = transactionsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Resolve profile names for the visible transactions
  const userIds = Array.from(
    new Set(
      transactions
        .map((t) => t.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  let profileNameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    profileNameMap = new Map((profileRows ?? []).map((p) => [p.id, p.name]));
  }

  const categorySet = new Set<string>();
  for (const row of categoriesResult.data ?? []) {
    if (row.category) categorySet.add(row.category);
  }
  const categories = Array.from(categorySet).sort((a, b) =>
    a.localeCompare(b, "ko"),
  );

  // Build the export URL with the same filter params so users export
  // exactly what's on screen.
  const exportParams = new URLSearchParams();
  if (params.type === "in" || params.type === "out" || params.type === "loss")
    exportParams.set("type", params.type);
  if (params.product_id) exportParams.set("product_id", params.product_id);
  if (params.user_id) exportParams.set("user_id", params.user_id);
  if (params.category) exportParams.set("category", params.category);
  if (params.site_id) exportParams.set("site_id", params.site_id);
  if (params.vendor_id) exportParams.set("vendor_id", params.vendor_id);
  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  const exportHref = exportParams.toString()
    ? `/api/export/transactions?${exportParams.toString()}`
    : "/api/export/transactions";

  // PDF 출고장: always available. The route itself forces type=out, so the
  // user doesn't need to manually filter to 출고 first — clicking the
  // button on any view will produce a 출고장 from whatever 출고 rows match
  // the other filters (product/user/category/date). If no 출고 row matches
  // the route returns 404 with a friendly message.
  const pdfParams = new URLSearchParams();
  if (params.product_id) pdfParams.set("product_id", params.product_id);
  if (params.user_id) pdfParams.set("user_id", params.user_id);
  if (params.category) pdfParams.set("category", params.category);
  if (params.site_id) pdfParams.set("site_id", params.site_id);
  if (params.from) pdfParams.set("from", params.from);
  if (params.to) pdfParams.set("to", params.to);
  const pdfHref = pdfParams.toString()
    ? `/api/pdf/delivery?${pdfParams.toString()}`
    : "/api/pdf/delivery";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">입출고 내역</h2>
          <p className="text-sm text-muted-foreground">
            전체 {totalCount.toLocaleString("ko-KR")}건
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={pdfHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            prefetch={false}
          >
            출고장 PDF
          </Link>
          <Link
            href={exportHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            prefetch={false}
          >
            CSV 내보내기
          </Link>
        </div>
      </div>

      <TransactionsFilters
        products={productsResult.data ?? []}
        categories={categories}
        profiles={profilesResult.data ?? []}
        sites={sitesResult.data ?? []}
        vendors={vendorsResult.data ?? []}
        initial={{
          type: params.type ?? "",
          product_id: params.product_id ?? "",
          user_id: params.user_id ?? "",
          category: params.category ?? "",
          site_id: params.site_id ?? "",
          vendor_id: params.vendor_id ?? "",
          from: params.from ?? "",
          to: params.to ?? "",
        }}
      />

      <TransactionsPagination currentPage={page} totalPages={totalPages} />

      <TransactionsTable
        transactions={transactions}
        profileNameMap={profileNameMap}
        currentUserId={currentUser?.id ?? null}
        isAdmin={isAdmin}
      />

      <TransactionsPagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}
