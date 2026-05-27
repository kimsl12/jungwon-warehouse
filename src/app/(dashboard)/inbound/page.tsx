import Link from "next/link";
import { ArrowDownToLine, Download, Package, Truck } from "lucide-react";

import { KPICard } from "@/components/shared/kpi-card";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { QuickTransactionButton } from "@/components/transactions/quick-transaction-button";
import { TransactionAdminDeleteButton } from "@/components/transactions/transaction-admin-delete-button";
import { TransactionsPagination } from "@/components/transactions/transactions-pagination";
import { PO_STATUS_LABEL, type PoStatus } from "@/lib/po-options";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = Promise<{
  page?: string;
  from?: string;
  to?: string;
}>;

const PO_TONE: Record<PoStatus, StatusTone> = {
  draft: "neutral",
  sent: "info",
  receiving: "warning",
  received: "success",
  canceled: "neutral",
};

export default async function InboundPage({
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

  let query = supabase
    .from("transactions")
    .select(
      "id, type, quantity, note, created_at, created_by, products!inner(id, name, category, unit, variant)",
      { count: "exact" },
    )
    .eq("type", "in")
    .is("canceled_at", null)
    .is("related_tx_id", null)
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

  const [txResult, profilesResult, sitesResult, pendingPoResult, last7Result] =
    await Promise.all([
      query,
      supabase.from("profiles").select("id, name"),
      supabase
        .from("sites")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("purchase_orders")
        .select(
          "id, po_number, status, order_date, due_date, vendor:vendors!inner(id, name)",
        )
        .in("status", ["sent", "receiving"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5),
      supabase
        .from("transactions")
        .select("quantity")
        .eq("type", "in")
        .is("canceled_at", null)
        .is("related_tx_id", null)
        .gte("created_at", sevenDaysAgo.toISOString()),
    ]);

  const transactions = txResult.data ?? [];
  const totalCount = txResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pendingPos = pendingPoResult.data ?? [];
  const last7Sum = (last7Result.data ?? []).reduce((s, t) => s + t.quantity, 0);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p.name]),
  );

  const poIds = pendingPos.map((po) => po.id);
  const poTotals = new Map<string, { ordered: number; received: number }>();
  if (poIds.length > 0) {
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("purchase_order_id, ordered_quantity, received_quantity")
      .in("purchase_order_id", poIds);
    for (const it of items ?? []) {
      const agg = poTotals.get(it.purchase_order_id) ?? {
        ordered: 0,
        received: 0,
      };
      agg.ordered += it.ordered_quantity;
      agg.received += it.received_quantity;
      poTotals.set(it.purchase_order_id, agg);
    }
  }

  const dateTimeFmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateOnlyFmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard
          label="총 입고 건수"
          value={totalCount.toLocaleString("ko-KR")}
          icon={ArrowDownToLine}
          iconAccent="success"
        />
        <KPICard
          label="입고 예정 PO"
          value={pendingPos.length.toLocaleString("ko-KR")}
          icon={Truck}
          iconAccent="info"
          delta={pendingPos.length > 0 ? "확인 필요" : "없음"}
          deltaTone={pendingPos.length > 0 ? "info" : "neutral"}
          deltaCaption=""
        />
        <KPICard
          label="최근 7일 입고량"
          value={last7Sum.toLocaleString("ko-KR")}
          icon={Package}
          iconAccent="brand"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          전체 {totalCount.toLocaleString("ko-KR")}건
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/api/export/transactions?type=in"
            prefetch={false}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Download className="size-3.5" />
            내보내기
          </Link>
          <QuickTransactionButton type="in" sites={sitesResult.data ?? []} />
        </div>
      </div>

      {pendingPos.length > 0 && (
        <section className="rounded-lg border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-[15px] font-semibold tracking-tight">
                입고 예정
              </h3>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                발송·부분수령 상태의 발주서 {pendingPos.length}건
              </p>
            </div>
            <Link
              href="/purchase-orders"
              className="text-xs text-primary hover:underline"
            >
              전체 발주서
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {pendingPos.map((po) => {
              const totals = poTotals.get(po.id);
              const tone = PO_TONE[po.status as PoStatus] ?? "neutral";
              const dueLabel = po.due_date
                ? dateOnlyFmt.format(new Date(po.due_date))
                : "—";
              return (
                <li key={po.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-info-bg text-info">
                    <Truck className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="font-mono text-[13px] font-semibold hover:underline"
                      >
                        {po.po_number}
                      </Link>
                      <span className="text-[12px] text-muted-foreground">
                        ·
                      </span>
                      <span className="text-[13px]">{po.vendor.name}</span>
                    </div>
                    {totals && (
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
                        수량 {totals.received.toLocaleString("ko-KR")} /{" "}
                        {totals.ordered.toLocaleString("ko-KR")}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[12px] tabular-nums text-muted-foreground">
                    납기 {dueLabel}
                  </div>
                  <StatusBadge tone={tone} dot>
                    {PO_STATUS_LABEL[po.status as PoStatus] ?? po.status}
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
        basePath="/inbound"
      />

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-[15px] font-semibold tracking-tight">
            입고 기록
          </h3>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            완료된 입고 트랜잭션
          </p>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            입고 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted">
                <tr className="text-[10.5px] font-medium uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">일시</th>
                  <th className="px-3 py-2.5 text-left font-medium">품목</th>
                  <th className="px-3 py-2.5 text-right font-medium">수량</th>
                  <th className="px-3 py-2.5 text-left font-medium">담당자</th>
                  <th className="px-3 py-2.5 text-left font-medium">메모</th>
                  {isAdmin && (
                    <th className="px-3 py-2.5 text-right font-medium" />
                  )}
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
                      <span className="font-semibold tabular-nums text-success">
                        +{tx.quantity.toLocaleString("ko-KR")}
                        {tx.products?.unit && (
                          <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                            {tx.products.unit}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-muted-foreground">
                      {tx.created_by
                        ? (profileMap.get(tx.created_by) ?? "—")
                        : "시스템"}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">
                      {tx.note ?? ""}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-3 text-right">
                        {!(
                          tx.note?.startsWith("자재 신청 출고") ||
                          tx.note?.startsWith("발주 ")
                        ) && <TransactionAdminDeleteButton txId={tx.id} />}
                      </td>
                    )}
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
        basePath="/inbound"
      />
    </div>
  );
}
