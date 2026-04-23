import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PO_STATUS_LABEL, type PoStatus } from "@/lib/po-options";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/inventory");

  let query = supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, order_date, due_date, created_at, vendor:vendors!inner(id, name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: pos, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const poIds = (pos ?? []).map((po) => po.id);
  const totalsMap = new Map<string, { ordered: number; received: number; value: number }>();
  if (poIds.length > 0) {
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("purchase_order_id, ordered_quantity, received_quantity, unit_price")
      .in("purchase_order_id", poIds);
    for (const it of items ?? []) {
      const agg = totalsMap.get(it.purchase_order_id) ?? { ordered: 0, received: 0, value: 0 };
      agg.ordered += it.ordered_quantity;
      agg.received += it.received_quantity;
      agg.value += it.ordered_quantity * it.unit_price;
      totalsMap.set(it.purchase_order_id, agg);
    }
  }

  const nf = new Intl.NumberFormat("ko-KR");
  const statuses: { value: string; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "draft", label: "작성중" },
    { value: "sent", label: "발송" },
    { value: "receiving", label: "부분수령" },
    { value: "received", label: "입고완료" },
    { value: "canceled", label: "취소" },
  ];
  const current = params.status ?? "all";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            매입 관리
          </p>
          <h2 className="text-2xl font-bold tracking-tight mt-1">발주서 목록</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            전체 {nf.format(total)}건
          </p>
        </div>
        <Link
          href="/purchase-orders/new"
          className="rounded bg-gradient-to-b from-primary to-[#1a202c] px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          발주서 작성
        </Link>
      </div>

      {/* 상태 탭 */}
      <div className="flex flex-wrap items-center gap-1 rounded bg-card p-1 w-fit">
        {statuses.map((s) => {
          const active = current === s.value;
          const href = s.value === "all" ? "/purchase-orders" : `/purchase-orders?status=${s.value}`;
          return (
            <Link
              key={s.value}
              href={href}
              className={
                "rounded px-3 py-1.5 text-xs font-medium transition-colors " +
                (active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-surface-low")
              }
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded bg-card overflow-hidden">
        <div className="grid grid-cols-[150px_1fr_110px_120px_110px_90px] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>발주번호</span>
          <span>거래처</span>
          <span className="text-right">품목/수량</span>
          <span className="text-right">금액 (원)</span>
          <span>납기</span>
          <span>상태</span>
        </div>
        {(pos ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            발주서가 없습니다.
          </div>
        ) : (
          (pos ?? []).map((po) => {
            const agg = totalsMap.get(po.id) ?? { ordered: 0, received: 0, value: 0 };
            return (
              <Link
                key={po.id}
                href={`/purchase-orders/${po.id}`}
                className="grid grid-cols-[150px_1fr_110px_120px_110px_90px] gap-3 items-center px-5 py-3.5 hover:bg-surface-low/50 transition-colors border-t"
              >
                <span className="text-sm font-mono tabular-nums">{po.po_number}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{po.vendor?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    작성 {po.order_date}
                  </p>
                </div>
                <span className="text-right text-xs tabular-nums">
                  {nf.format(agg.received)} / {nf.format(agg.ordered)}
                </span>
                <span className="text-right text-sm tabular-nums font-semibold">
                  {nf.format(agg.value)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {po.due_date ?? "—"}
                </span>
                <StatusBadge status={po.status as PoStatus} />
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const active = p === page;
            const href = `/purchase-orders?${params.status ? `status=${params.status}&` : ""}page=${p}`;
            return (
              <Link
                key={p}
                href={href}
                className={
                  "rounded px-2.5 py-1 " +
                  (active
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:bg-surface-high")
                }
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PoStatus }) {
  const label = PO_STATUS_LABEL[status];
  const tone =
    status === "received"
      ? "bg-emerald-100 text-emerald-700"
      : status === "receiving"
        ? "bg-amber-100 text-amber-700"
        : status === "sent"
          ? "bg-blue-100 text-blue-700"
          : status === "canceled"
            ? "bg-muted text-muted-foreground"
            : "bg-surface-high text-muted-foreground";
  return (
    <span className={"inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider w-fit " + tone}>
      {label}
    </span>
  );
}
