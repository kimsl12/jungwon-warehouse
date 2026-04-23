import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { COMPANY } from "@/lib/company";
import { attachmentDispositionHeader } from "@/lib/csv/generate";
import { createClient } from "@/lib/supabase/server";
import {
  PurchaseOrderPdf,
  type PurchaseOrderPdfContactPerson,
  type PurchaseOrderPdfItem,
} from "@/templates/purchase-order-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pdf/purchase-order?id=<po_id>
 *
 * 발주서 PDF 다운로드. admin만 접근 가능(RLS가 SELECT는 전체 허용이지만
 * 실무상 발주서 접근은 admin에 한정).
 */
export async function GET(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const poId = url.searchParams.get("id");
  if (!poId) {
    return new NextResponse("id 파라미터가 필요합니다.", { status: 400 });
  }

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .select(
      `id, po_number, order_date, due_date, created_by,
       payment_terms, delivery_terms, inspection_terms,
       ship_to, ship_to_contact, note,
       vendor:vendors!inner(name, address, contact_phone, fax)`,
    )
    .eq("id", poId)
    .single();

  if (error || !po) {
    return new NextResponse("발주서를 찾을 수 없습니다.", { status: 404 });
  }

  // 발주서 작성자의 profile 로 담당자 칸 채우기.
  // 작성자 정보가 비어 있으면 회사 기본값(COMPANY.contactPerson) 폴백.
  let contactPerson: PurchaseOrderPdfContactPerson = {
    name: COMPANY.contactPerson,
    title: null,
    phone: COMPANY.contactPhone,
    email: COMPANY.contactEmail,
  };
  if (po.created_by) {
    const { data: author } = await supabase
      .from("profiles")
      .select("name, title, phone, email")
      .eq("id", po.created_by)
      .single();
    if (author) {
      contactPerson = {
        name: author.name ?? COMPANY.contactPerson,
        title: author.title ?? null,
        phone: author.phone ?? null,
        email: author.email ?? null,
      };
    }
  }

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select(
      "id, product_name, product_variant, spec, unit, ordered_quantity, unit_price, note, sort_order",
    )
    .eq("purchase_order_id", poId)
    .order("sort_order", { ascending: true });

  const pdfItems: PurchaseOrderPdfItem[] = (items ?? []).map((it, i) => ({
    no: i + 1,
    name: it.product_name,
    variant: it.product_variant,
    spec: it.spec,
    unit: it.unit,
    quantity: it.ordered_quantity,
    unit_price: it.unit_price,
    note: it.note,
  }));

  const pdfBuffer = await renderToBuffer(
    <PurchaseOrderPdf
      poNumber={po.po_number}
      orderDate={po.order_date}
      dueDate={po.due_date}
      vendor={{
        name: po.vendor?.name ?? "",
        address: po.vendor?.address ?? null,
        contact_phone: po.vendor?.contact_phone ?? null,
        fax: po.vendor?.fax ?? null,
      }}
      items={pdfItems}
      paymentTerms={po.payment_terms}
      deliveryTerms={po.delivery_terms}
      inspectionTerms={po.inspection_terms}
      shipTo={po.ship_to}
      shipToContact={po.ship_to_contact}
      note={po.note}
      contactPerson={contactPerson}
    />,
  );

  const filename = `발주서_${po.po_number}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentDispositionHeader(filename),
      "Cache-Control": "no-store",
    },
  });
}
