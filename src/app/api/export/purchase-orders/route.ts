import { NextResponse } from "next/server";

import {
  attachmentDispositionHeader,
  formatYmdCompact,
  rowsToCsv,
} from "@/lib/csv/generate";
import { PO_STATUS_LABEL, type PoStatus } from "@/lib/po-options";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export/purchase-orders
 *
 * 발주서 목록 CSV (품목 단위 1행). 단가가 포함되므로 admin 전용.
 * Filename: 정원전기_발주내역_YYYYMMDD.csv
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return new NextResponse("Admin only", { status: 403 });
  }

  const { data: items, error } = await supabase
    .from("purchase_order_items")
    .select(
      `product_name, product_variant, spec, unit,
       ordered_quantity, received_quantity, unit_price, note, sort_order,
       purchase_orders!inner(po_number, status, order_date, due_date,
         vendors(name))`,
    );

  if (error) {
    return new NextResponse(
      `Failed to fetch purchase orders: ${error.message}`,
      {
        status: 500,
      },
    );
  }

  // item 테이블엔 created_at 이 없어 발주번호(날짜 기반) 최신순 + 라인 순서로 정렬
  const sorted = (items ?? []).sort(
    (a, b) =>
      (b.purchase_orders?.po_number ?? "").localeCompare(
        a.purchase_orders?.po_number ?? "",
      ) || a.sort_order - b.sort_order,
  );

  const headers = [
    "발주번호",
    "거래처",
    "발주일",
    "납기일",
    "상태",
    "품목명",
    "변형",
    "규격",
    "단위",
    "발주수량",
    "입고수량",
    "단가(원)",
    "공급가(원)",
    "비고",
  ];
  const rows = sorted.map((it) => {
    const po = it.purchase_orders;
    return [
      po?.po_number ?? "",
      po?.vendors?.name ?? "",
      po?.order_date ?? "",
      po?.due_date ?? "",
      PO_STATUS_LABEL[(po?.status ?? "draft") as PoStatus] ?? po?.status ?? "",
      it.product_name,
      it.product_variant ?? "",
      it.spec ?? "",
      it.unit ?? "",
      it.ordered_quantity,
      it.received_quantity,
      it.unit_price,
      it.ordered_quantity * it.unit_price,
      it.note ?? "",
    ];
  });

  const csv = rowsToCsv(headers, rows);
  const filename = `정원전기_발주내역_${formatYmdCompact()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": attachmentDispositionHeader(filename),
      "Cache-Control": "no-store",
    },
  });
}
