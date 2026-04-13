import Link from "next/link";
import { Download, FileText } from "lucide-react";

import { QuickTransactionButton } from "@/components/transactions/quick-transaction-button";
import { TransactionsPagination } from "@/components/transactions/transactions-pagination";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = Promise<{
  page?: string;
  from?: string;
  to?: string;
}>;

export default async function OutboundPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select("id, type, quantity, note, created_at, created_by, site_id, products!inner(id, name, category, unit), sites(id, name)", { count: "exact" })
    .eq("type", "out")
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) {
    const endOfDay = new Date(params.to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  const [txResult, profilesResult, sitesResult] = await Promise.all([
    query,
    supabase.from("profiles").select("id, name"),
    supabase.from("sites").select("id, name").eq("active", true).order("name"),
  ]);

  const transactions = txResult.data ?? [];
  const totalCount = txResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p.name]));

  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // PDF export URL
  const pdfParams = new URLSearchParams();
  if (params.from) pdfParams.set("from", params.from);
  if (params.to) pdfParams.set("to", params.to);
  const pdfHref = pdfParams.toString() ? `/api/pdf/delivery?${pdfParams}` : "/api/pdf/delivery";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            출고 관리
          </p>
          <h2 className="text-2xl font-bold tracking-tight mt-1">출고 내역</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={pdfHref}
            className="flex items-center gap-1.5 rounded bg-surface-low px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-high transition-colors"
            prefetch={false}
          >
            <FileText className="h-3.5 w-3.5" />
            출고장 PDF
          </Link>
          <Link
            href="/api/export/transactions?type=out"
            className="flex items-center gap-1.5 rounded bg-surface-low px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-high transition-colors"
            prefetch={false}
          >
            <Download className="h-3.5 w-3.5" />
            내보내기
          </Link>
          <QuickTransactionButton type="out" sites={sitesResult.data ?? []} />
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded bg-secondary text-secondary-foreground p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-secondary-foreground/60">출고 총 건수</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums">{totalCount.toLocaleString("ko-KR")}</p>
        </div>
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">현재 페이지</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums">{transactions.length}</p>
          <p className="text-xs text-muted-foreground mt-1">건 표시 중</p>
        </div>
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">총 페이지</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums">{totalPages}</p>
        </div>
      </div>

      {/* Table */}
      <TransactionsPagination currentPage={page} totalPages={totalPages} basePath="/outbound" />

      <div className="rounded bg-card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_100px_100px_80px_auto] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>ID</span>
          <span>품목</span>
          <span>현장</span>
          <span className="text-right">수량</span>
          <span>상태</span>
          <span className="text-right">담당자</span>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            출고 내역이 없습니다.
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="grid grid-cols-[auto_1fr_100px_100px_80px_auto] gap-3 items-center px-5 py-3.5 hover:bg-surface-low/50 transition-colors">
              <span className="text-xs text-muted-foreground font-mono">{tx.id.slice(0, 8)}</span>
              <div>
                <p className="text-sm font-medium">{tx.products?.name ?? "-"}</p>
                <p className="text-xs text-muted-foreground">{tx.products?.category ?? ""}</p>
              </div>
              <span className="text-xs text-muted-foreground truncate">{tx.sites?.name ?? "-"}</span>
              <p className="text-right text-sm font-bold tabular-nums">
                {tx.quantity.toLocaleString("ko-KR")}
                {tx.products?.unit && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{tx.products.unit}</span>}
              </p>
              <span className="inline-block rounded bg-secondary-container/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary w-fit">
                출고
              </span>
              <span className="text-right text-xs text-muted-foreground">
                {tx.created_by ? profileMap.get(tx.created_by) ?? "-" : "시스템"}
                <span className="block text-[10px] tabular-nums">{dateFormatter.format(new Date(tx.created_at))}</span>
              </span>
            </div>
          ))
        )}
      </div>

      <TransactionsPagination currentPage={page} totalPages={totalPages} basePath="/outbound" />
    </div>
  );
}
