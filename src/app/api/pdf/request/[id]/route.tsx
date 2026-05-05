import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import path from "node:path";

import { attachmentDispositionHeader, formatYmdCompact } from "@/lib/csv/generate";
import { createClient } from "@/lib/supabase/server";
import {
  MaterialRequestPdf,
  type MaterialRequestPdfItem,
} from "@/templates/material-request-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pdf/request/[id]
 *
 * 자재 신청 승인 후 출고장 PDF를 생성한다. 상태가 approved 또는 fulfilled 인
 * 경우만 발급. 본인 신청이거나 admin만 접근 가능 (RLS로 통제).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: request, error: requestErr } = await supabase
    .from("material_requests")
    .select(
      "id, status, note, created_at, approved_at, created_by, sites(name, address)",
    )
    .eq("id", id)
    .single();

  if (requestErr || !request) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (request.status !== "approved" && request.status !== "fulfilled") {
    return new NextResponse("승인된 신청만 PDF 발급이 가능합니다.", { status: 400 });
  }

  const [itemsResult, requesterResult] = await Promise.all([
    supabase
      .from("material_request_items")
      .select(
        "product_name, product_variant, unit, requested_quantity, fulfilled_quantity, note, sort_order",
      )
      .eq("request_id", id)
      .order("sort_order", { ascending: true }),
    // created_by 가 null (사용자 삭제) 인 경우 더미 UUID 로 0건 반환
    supabase
      .from("profiles")
      .select("name, title, phone")
      .eq("id", request.created_by ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle(),
  ]);

  if (itemsResult.error) {
    return new NextResponse("Failed to fetch items: " + itemsResult.error.message, {
      status: 500,
    });
  }

  const items: MaterialRequestPdfItem[] = (itemsResult.data ?? []).map((it, idx) => ({
    no: idx + 1,
    name: it.product_name,
    variant: it.product_variant,
    unit: it.unit,
    requestedQuantity: it.requested_quantity,
    fulfilledQuantity: it.fulfilled_quantity,
    note: it.note,
  }));

  const slipNumber = `MR-${formatYmdCompact()}-${id.slice(0, 6).toUpperCase()}`;
  const issueDate = new Date().toISOString().slice(0, 10);
  const approvedDate = request.approved_at
    ? new Date(request.approved_at).toISOString().slice(0, 10)
    : null;
  const logoPath = path.join(process.cwd(), "public", "jungwon-logo.png");

  const pdfBuffer = await renderToBuffer(
    <MaterialRequestPdf
      slipNumber={slipNumber}
      issueDate={issueDate}
      approvedDate={approvedDate}
      siteName={request.sites?.name ?? null}
      siteAddress={request.sites?.address ?? null}
      requesterName={requesterResult.data?.name ?? null}
      requesterTitle={requesterResult.data?.title ?? null}
      requesterPhone={requesterResult.data?.phone ?? null}
      requestNote={request.note}
      items={items}
      logoPath={logoPath}
    />,
  );

  const filename = `정원전기_자재출고장_${formatYmdCompact()}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentDispositionHeader(filename),
      "Cache-Control": "no-store",
    },
  });
}
