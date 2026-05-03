import Link from "next/link";
import { ArrowUpFromLine, Download, FileText, Send } from "lucide-react";

import { KPICard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
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

export default async function OutboundPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select(
      "id, type, quantity, note, created_at, created_by, site_id, products!inner(id, name, category, unit, variant), sites(id, name)",
      { count: "exact" },
    )
    .eq("type", "out")
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) {
    const endOfDay = new Date(params.to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    txResult,
    profilesResult,
    sitesResult,
    queueResult,
    last7Result,
  ] = await Promise.all([
    query,
    supabase.from("profiles").select("id, name"),
    supabase.from("sites").select("id, name").eq("active", true).order("name"),
    supabase
      .from("material_requests")
      .select(
        "id, status, is_urgent, created_at, created_by, site:sites!inner(id, name)",
      )
      .eq("status", "approved")
      .order("is_urgent", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("transactions")
      .select("quantity")
      .eq("type", "out")
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  const transactions = txResult.data ?? [];
  const totalCount = txResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const queue = queueResult.data ?? [];
  const last7Sum = (last7Result.data ?? []).reduce(
    (s, t) => s + t.quantity,
    0,
  );

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p.name]),
  );

  const queueIds = queue.map((q) => q.id);
  const queueItemCounts = new Map<string, number>();
  if (queueIds.length > 0) {
    const { data: items } = await supabase
      .from("material_request_items")
      .select("request_id")
      .in("request_id", queueIds);
    for (const it of items ?? []) {
      queueItemCounts.set(
        it.request_id,
        (queueItemCounts.get(it.request_id) ?? 0) + 1,
      );
    }
  }

  const dateTimeFmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pdfParams = new URLSearchParams();
  if (params.from) pdfParams.set("from", params.from);
  if (params.to) pdfParams.set("to", params.to);
  const pdfHref = pdfParams.toString()
    ? `/api/pdf/delivery?${pdfParams}`
    : "/api/pdf/delivery";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard
          label="총 출고 건수"
          value={totalCount.toLocaleString("ko-KR")}
          icon={ArrowUpFromLine}
          iconAccent="brand"
        />
        <KPICard
          label="출고 대기 신청"
          value={queue.length.toLocaleString("ko-KR")}
          icon={Send}
          iconAccent={queue.length > 0 ? "warning" : "info"}
          delta={queue.length > 0 ? "처리 필요" : "없음"}
          deltaTone={queue.length > 0 ? "warning" : "neutral"}
          deltaCaption=""
        />
        <KPICard
          label="최근 7일 출고량"
          value={last7Sum.toLocaleString("ko-KR")}
          icon={ArrowUpFromLine}
          iconAccent="brand"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          전체 {totalCount.toLocaleString("ko-KR")}건
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={pdfHref}
            prefetch={false}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <FileText className="size-3.5" />
            출고장 PDF
          </Link>
          <Link
            href="/api/export/transactions?type=out"
            prefetch={false}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Download className="size-3.5" />
            내보내기
          </Link>
          <QuickTransactionButton type="out" sites={sitesResult.data ?? []} />
        </div>
      </div>

      {queue.length > 0 && (
        <section className="rounded-lg border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-[15px] font-semibold tracking-tight">
                출고 대기
              </h3>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                승인 후 미출고 자재 신청 {queue.length}건
              </p>
            </div>
            <Link
              href="/requests?status=approved"
              className="text-xs text-primary hover:underline"
            >
              전체 신청
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {queue.map((req) => {
              const itemCount = queueItemCounts.get(req.id) ?? 0;
              const requesterName = req.created_by
                ? (profileMap.get(req.created_by) ?? "—")
                : "—";
              return (
                <li key={req.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-warning-bg text-warning">
                    <Send className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/requests/${req.id}`}
                        className="text-[13px] font-semibold hover:underline"
                      >
                        {req.site.name}
                      </Link>
                      <span className="text-[12px] text-muted-foreground">·</span>
                      <span className="text-[12.5px] text-muted-foreground">
                        {requesterName}
                      </span>
                      {req.is_urgent && (
                        <StatusBadge tone="danger">긴급</StatusBadge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      자재 {itemCount}건 ·{" "}
                      {dateTimeFmt.format(new Date(req.created_at))}
                    </p>
                  </div>
                  <StatusBadge tone="warning" dot>
                    출고 대기
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <TransactionsPagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/outbound"
      />

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-[15px] font-semibold tracking-tight">
            출고 기록
          </h3>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            완료된 출고 트랜잭션
          </p>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            출고 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted">
                <tr className="text-[10.5px] font-medium uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">일시</th>
                  <th className="px-3 py-2.5 text-left font-medium">품목</th>
                  <th className="px-3 py-2.5 text-right font-medium">수량</th>
                  <th className="px-3 py-2.5 text-left font-medium">현장</th>
                  <th className="px-3 py-2.5 text-left font-medium">담당자</th>
                  <th className="px-3 py-2.5 text-left font-medium">메모</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">
                      {dateTimeFmt.format(new Date(tx.created_at))}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold">
                        {tx.products?.name ?? "—"}
                      </div>
                      {tx.products?.variant && (
                        <div className="text-[11.5px] text-muted-foreground">
                          {tx.products.variant}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-semibold tabular-nums text-brand-600">
                        −{tx.quantity.toLocaleString("ko-KR")}
                        {tx.products?.unit && (
                          <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                            {tx.products.unit}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[12.5px]">
                      {tx.sites?.name ? (
                        <Link
                          href={`/sites/${tx.sites.id}`}
                          className="hover:underline"
                        >
                          {tx.sites.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-muted-foreground">
                      {tx.created_by
                        ? (profileMap.get(tx.created_by) ?? "—")
                        : "시스템"}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">
                      {tx.note ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TransactionsPagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/outbound"
      />
    </div>
  );
}
