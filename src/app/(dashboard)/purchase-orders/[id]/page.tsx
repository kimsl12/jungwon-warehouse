import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { PurchaseOrderActions } from "@/components/purchase-orders/purchase-order-actions";
import { PurchaseOrderReceiveForm } from "@/components/purchase-orders/purchase-order-receive-form";
import { PO_STATUS_LABEL, type PoStatus } from "@/lib/po-options";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function PurchaseOrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;

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

  const { data: po } = await supabase
    .from("purchase_orders")
    .select(
      `id, po_number, status, order_date, due_date, created_at, sent_at, completed_at,
       payment_terms, delivery_terms, inspection_terms, ship_to, ship_to_contact, note,
       vendor:vendors!inner(id, name, address, contact_person, contact_phone, fax, email)`,
    )
    .eq("id", id)
    .single();
  if (!po) notFound();

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select(
      "id, product_id, product_name, product_variant, spec, unit, ordered_quantity, received_quantity, unit_price, note, sort_order",
    )
    .eq("purchase_order_id", id)
    .order("sort_order");

  const nf = new Intl.NumberFormat("ko-KR");
  const supplyTotal = (items ?? []).reduce((s, it) => s + it.ordered_quantity * it.unit_price, 0);
  const taxTotal = Math.round(supplyTotal * 0.1);
  const grandTotal = supplyTotal + taxTotal;

  const status = po.status as PoStatus;
  const canSendOrCancel = status === "draft";
  const canCancelSent = status === "sent";
  const canReceive = status === "sent" || status === "receiving";
  const totalItems = items?.length ?? 0;
  const fulfilledItems = (items ?? []).filter(
    (it) => it.received_quantity >= it.ordered_quantity,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/purchase-orders"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 발주서 목록
        </Link>
      </div>

      {/* Header */}
      <div className="rounded bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              발주서
            </p>
            <h2 className="text-2xl font-bold tracking-tight mt-1 font-mono tabular-nums">
              {po.po_number}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {po.vendor?.name} · 작성일 {po.order_date}
              {po.due_date && <span> · 납기 {po.due_date}</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={status} />
            <p className="text-xs text-muted-foreground tabular-nums">
              완료 {fulfilledItems} / {totalItems} 품목
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href={`/api/pdf/purchase-order?id=${po.id}`}
            className="inline-flex items-center gap-1.5 rounded bg-surface-low px-3 py-2 text-xs font-medium hover:bg-surface-high"
            prefetch={false}
          >
            <Download className="h-3.5 w-3.5" /> PDF 다운로드
          </Link>
          <PurchaseOrderActions
            poId={po.id}
            canSend={canSendOrCancel}
            canCancel={canSendOrCancel || canCancelSent}
            vendorFax={po.vendor?.fax ?? null}
          />
        </div>
      </div>

      {/* 거래처 정보 */}
      <div className="rounded bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">수주처 정보</h3>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
          <InfoRow label="상호" value={po.vendor?.name} />
          <InfoRow label="담당자" value={po.vendor?.contact_person} />
          <InfoRow label="주소" value={po.vendor?.address} span2 />
          <InfoRow label="TEL" value={po.vendor?.contact_phone} />
          <InfoRow label="FAX" value={po.vendor?.fax} />
          <InfoRow label="이메일" value={po.vendor?.email} span2 />
        </dl>
      </div>

      {/* 품목 */}
      <div className="rounded bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">발주 품목 ({totalItems}건)</h3>
        <div className="rounded border overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_60px_80px_90px_100px_100px_1fr] gap-2 px-3 py-2 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span>품목</span>
            <span>규격</span>
            <span>단위</span>
            <span className="text-right">수량</span>
            <span className="text-right">입고</span>
            <span className="text-right">단가</span>
            <span className="text-right">공급가액</span>
            <span>비고</span>
          </div>
          {(items ?? []).map((it) => {
            const supply = it.ordered_quantity * it.unit_price;
            const fulfilled = it.received_quantity >= it.ordered_quantity;
            return (
              <div
                key={it.id}
                className={`grid grid-cols-[1fr_100px_60px_80px_90px_100px_100px_1fr] gap-2 items-center px-3 py-2 border-t text-xs ${fulfilled ? "bg-emerald-50/40" : ""}`}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {it.product_name}
                    {it.product_variant && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        · {it.product_variant}
                      </span>
                    )}
                  </p>
                </div>
                <span className="truncate">{it.spec ?? "—"}</span>
                <span className="text-muted-foreground">{it.unit ?? "—"}</span>
                <span className="text-right tabular-nums font-semibold">
                  {nf.format(it.ordered_quantity)}
                </span>
                <span
                  className={
                    "text-right tabular-nums " +
                    (fulfilled ? "text-emerald-700 font-semibold" : "text-muted-foreground")
                  }
                >
                  {nf.format(it.received_quantity)}
                </span>
                <span className="text-right tabular-nums">
                  {it.unit_price > 0 ? nf.format(it.unit_price) : "—"}
                </span>
                <span className="text-right tabular-nums font-semibold">
                  {supply > 0 ? nf.format(supply) : "—"}
                </span>
                <span className="truncate text-muted-foreground">{it.note ?? ""}</span>
              </div>
            );
          })}
          {/* Totals */}
          <div className="grid grid-cols-[1fr_100px_60px_80px_90px_100px_100px_1fr] gap-2 items-center px-3 py-2 border-t bg-surface-low font-semibold text-xs">
            <span className="col-span-6 text-right">공급가액 합계</span>
            <span className="text-right tabular-nums">{nf.format(supplyTotal)}</span>
            <span />
          </div>
          <div className="grid grid-cols-[1fr_100px_60px_80px_90px_100px_100px_1fr] gap-2 items-center px-3 py-2 bg-surface-low text-xs">
            <span className="col-span-6 text-right text-muted-foreground">세액 (10%)</span>
            <span className="text-right tabular-nums">{nf.format(taxTotal)}</span>
            <span />
          </div>
          <div className="grid grid-cols-[1fr_100px_60px_80px_90px_100px_100px_1fr] gap-2 items-center px-3 py-2 bg-foreground text-background font-bold text-sm">
            <span className="col-span-6 text-right">합계 (부가세 포함)</span>
            <span className="text-right tabular-nums">{nf.format(grandTotal)}</span>
            <span />
          </div>
        </div>
      </div>

      {/* 조건·비고 */}
      <div className="rounded bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">거래 조건 · 배송지 · 비고</h3>
        <dl className="grid grid-cols-3 gap-y-2 gap-x-6 text-sm">
          <InfoRow label="결제조건" value={po.payment_terms} />
          <InfoRow label="인도조건" value={po.delivery_terms} />
          <InfoRow label="검수조건" value={po.inspection_terms} />
          <InfoRow label="배송지" value={po.ship_to} span2 />
          <InfoRow label="받는이" value={po.ship_to_contact} />
          <InfoRow label="비고" value={po.note} span3 />
        </dl>
      </div>

      {/* 입고 처리 (sent | receiving 상태일 때만) */}
      {canReceive && items && items.length > 0 && (
        <div className="rounded bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">입고 처리</h3>
          <p className="text-xs text-muted-foreground mb-4">
            각 품목의 "이번에 입고" 수량을 입력하고 "입고 확정"을 누르세요.
            부분 수령이 가능하며, 재고에 자동으로 반영됩니다.
          </p>
          <PurchaseOrderReceiveForm
            poId={po.id}
            items={items.map((it) => ({
              id: it.id,
              name: it.product_name,
              variant: it.product_variant,
              unit: it.unit,
              ordered_quantity: it.ordered_quantity,
              received_quantity: it.received_quantity,
            }))}
          />
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  span2 = false,
  span3 = false,
}: {
  label: string;
  value: string | null | undefined;
  span2?: boolean;
  span3?: boolean;
}) {
  return (
    <div className={span3 ? "col-span-3" : span2 ? "col-span-2" : ""}>
      <dt className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value ?? "—"}</dd>
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
    <span className={"inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider " + tone}>
      {label}
    </span>
  );
}
