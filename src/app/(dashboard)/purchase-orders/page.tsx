import Link from "next/link";
import { redirect } from "next/navigation";

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { PO_STATUS_LABEL, type PoStatus } from "@/lib/po-options";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const PO_TONE: Record<PoStatus, StatusTone> = {
  draft: "neutral",
  sent: "info",
  receiving: "warning",
  received: "success",
  canceled: "neutral",
};

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          전체 {nf.format(total)}건
        </p>
        <Link
          href="/purchase-orders/new"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          발주서 작성
        </Link>
      </div>

      <div className="flex w-fit flex-wrap items-center gap-1 rounded-md bg-muted p-1">
        {statuses.map((s) => {
          const active = current === s.value;
          const href =
            s.value === "all"
              ? "/purchase-orders"
              : `/purchase-orders?status=${s.value}`;
          return (
            <Link
              key={s.value}
              href={href}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="grid grid-cols-[150px_1fr_110px_120px_110px_100px] gap-3 bg-muted px-5 py-2.5 text-[10.5px] font-medium uppercase tracking-widest text-muted-foreground">
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
            const agg = totalsMap.get(po.id) ?? {
              ordered: 0,
              received: 0,
              value: 0,
            };
            const tone = PO_TONE[po.status as PoStatus] ?? "neutral";
            return (
              <Link
                key={po.id}
                href={`/purchase-orders/${po.id}`}
                className="grid grid-cols-[150px_1fr_110px_120px_110px_100px] items-center gap-3 border-t border-border px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="font-mono text-sm tabular-nums">
                  {po.po_number}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {po.vendor?.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    작성 {po.order_date}
                  </p>
                </div>
                <span className="text-right text-xs tabular-nums">
                  {nf.format(agg.received)} / {nf.format(agg.ordered)}
                </span>
                <span className="text-right text-sm font-semibold tabular-nums">
                  {nf.format(agg.value)}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {po.due_date ?? "—"}
                </span>
                <StatusBadge tone={tone} dot>
                  {PO_STATUS_LABEL[po.status as PoStatus]}
                </StatusBadge>
              </Link>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const active = p === page;
            const href = `/purchase-orders?${params.status ? `status=${params.status}&` : ""}page=${p}`;
            return (
              <Link
                key={p}
                href={href}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-input bg-card text-muted-foreground hover:bg-muted",
                )}
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

