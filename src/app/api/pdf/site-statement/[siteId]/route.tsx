import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import path from "node:path";

import { attachmentDispositionHeader, formatYmdCompact } from "@/lib/csv/generate";
import { createClient } from "@/lib/supabase/server";
import {
  SiteStatementPdf,
  type SiteStatementItem,
} from "@/templates/site-statement-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pdf/site-statement/[siteId]?type=monthly&from=YYYY-MM-DD&to=YYYY-MM-DD
 * GET /api/pdf/site-statement/[siteId]?type=completion
 *
 *   monthly   : from/to 기간의 출고 합계
 *   completion: 현장 전체 기간 (최초 트랜잭션 ~ 현장 비활성화 시점 또는 now)
 *
 * 단가는 vendor_product_prices 기반 "가장 최근에 등록된" 가격을 product별로 사용.
 * 못 찾으면 0으로 표시.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "monthly") as "monthly" | "completion";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  if (type !== "monthly" && type !== "completion") {
    return new NextResponse("Invalid type", { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return new NextResponse("Admin only", { status: 403 });
  }

  const { data: site } = await supabase
    .from("sites")
    .select("id, name, address, active, updated_at")
    .eq("id", siteId)
    .single();
  if (!site) return new NextResponse("Not Found", { status: 404 });

  // 기간 결정
  let dateFrom: string;
  let dateTo: string;
  if (type === "monthly") {
    if (!fromParam || !toParam) {
      return new NextResponse("from/to required for monthly", { status: 400 });
    }
    dateFrom = fromParam;
    dateTo = toParam;
  } else {
    // completion: 최초 트랜잭션 ~ 현장 비활성화 시점 (active=false) 또는 now
    const { data: firstTx } = await supabase
      .from("transactions")
      .select("created_at")
      .eq("site_id", siteId)
      .eq("type", "out")
      .is("canceled_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    dateFrom = firstTx?.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    dateTo = !site.active
      ? site.updated_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  }

  const endOfTo = new Date(dateTo);
  endOfTo.setHours(23, 59, 59, 999);

  // 출고 트랜잭션 조회 (취소된 것 제외)
  const { data: txRows, error: txErr } = await supabase
    .from("transactions")
    .select(
      "id, product_id, quantity, created_at, products!inner(id, name, variant, unit)",
    )
    .eq("site_id", siteId)
    .eq("type", "out")
    .is("canceled_at", null)
    .gte("created_at", dateFrom)
    .lte("created_at", endOfTo.toISOString())
    .order("created_at", { ascending: true });

  if (txErr) {
    return new NextResponse("Failed to fetch transactions: " + txErr.message, { status: 500 });
  }

  const rows = txRows ?? [];
  const productIds = Array.from(new Set(rows.map((r) => r.product_id)));

  // 단가 조회: product별 최신 등록 단가 1개
  const priceMap = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: priceRows } = await supabase
      .from("vendor_product_prices")
      .select("product_id, unit_price, created_at")
      .in("product_id", productIds)
      .order("created_at", { ascending: false });
    for (const p of priceRows ?? []) {
      if (!priceMap.has(p.product_id)) {
        priceMap.set(p.product_id, p.unit_price);
      }
    }
  }

  const items: SiteStatementItem[] = rows.map((r, idx) => {
    const unitPrice = priceMap.get(r.product_id) ?? 0;
    const supply = r.quantity * unitPrice;
    return {
      no: idx + 1,
      date: new Date(r.created_at).toISOString().slice(0, 10),
      name: r.products?.name ?? "-",
      variant: r.products?.variant ?? null,
      unit: r.products?.unit ?? null,
      quantity: r.quantity,
      unitPrice,
      supply,
    };
  });

  const statementNumber = `${type === "monthly" ? "MS" : "CS"}-${formatYmdCompact()}-${siteId.slice(0, 6).toUpperCase()}`;
  const issueDate = new Date().toISOString().slice(0, 10);
  const logoPath = path.join(process.cwd(), "public", "jungwon-logo.png");

  const pdfBuffer = await renderToBuffer(
    <SiteStatementPdf
      statementNumber={statementNumber}
      issueDate={issueDate}
      statementType={type}
      siteName={site.name}
      siteAddress={site.address}
      dateFrom={dateFrom}
      dateTo={dateTo}
      items={items}
      logoPath={logoPath}
    />,
  );

  const safeName = site.name.replace(/[/\\:*?"<>|]/g, "_");
  const suffix = type === "monthly" ? "월말정산서" : "준공정산서";
  const filename = `${safeName}_${suffix}_${formatYmdCompact()}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentDispositionHeader(filename),
      "Cache-Control": "no-store",
    },
  });
}
