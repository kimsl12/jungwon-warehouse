import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import path from "node:path";

import {
  attachmentDispositionHeader,
  formatYmdCompact,
} from "@/lib/csv/generate";
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
 * sort=name(기본) | date — 품목명 가나다순 / 마지막 출고일순 정렬.
 * 단가는 vendor_product_prices 기반 "가장 최근에 등록된" 가격을 product별로 사용.
 * 못 찾으면 0으로 표시.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "monthly") as
    "monthly" | "completion";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const sort = (url.searchParams.get("sort") ?? "name") as "name" | "date";

  if (type !== "monthly" && type !== "completion") {
    return new NextResponse("Invalid type", { status: 400 });
  }
  if (sort !== "name" && sort !== "date") {
    return new NextResponse("Invalid sort", { status: 400 });
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
    dateFrom =
      firstTx?.created_at?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10);
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
    return new NextResponse("Failed to fetch transactions: " + txErr.message, {
      status: 500,
    });
  }

  const rows = txRows ?? [];
  const productIds = Array.from(new Set(rows.map((r) => r.product_id)));

  // 단가 조회: 정산 기간 말(dateTo) 기준 단가 (get_prices_as_of RPC).
  // "지금 시점 최신 단가"를 쓰면 단가 인상 후 과거 정산서를 재발급할 때
  // 금액이 달라지므로, 기간 기준 이력 단가로 고정한다.
  // get_prices_as_of 는 마이그레이션 20260707010000 이후 추가됨 —
  // database.types 재생성(pnpm gen:types) 전까지 type-safe 우회.
  const priceMap = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: priceRows } = await supabase.rpc(
      "get_prices_as_of" as never,
      {
        p_product_ids: productIds,
        p_as_of: endOfTo.toISOString(),
      } as never,
    );
    for (const p of (priceRows ?? []) as Array<{
      product_id: string;
      unit_price: number;
    }>) {
      priceMap.set(p.product_id, p.unit_price);
    }
  }

  // 같은 자재(product_id)는 한 줄로 합산. 출고일은 가장 최근 일자.
  // 정산서 자체가 기간별 청구라 개별 출고 row 분리는 노이즈만 큼.
  type Agg = {
    product_id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    quantity: number;
    lastDate: string;
    unitPrice: number;
  };
  const aggMap = new Map<string, Agg>();
  for (const r of rows) {
    const date = new Date(r.created_at).toISOString().slice(0, 10);
    const existing = aggMap.get(r.product_id);
    if (existing) {
      existing.quantity += r.quantity;
      if (date > existing.lastDate) existing.lastDate = date;
    } else {
      aggMap.set(r.product_id, {
        product_id: r.product_id,
        name: r.products?.name ?? "-",
        variant: r.products?.variant ?? null,
        unit: r.products?.unit ?? null,
        quantity: r.quantity,
        lastDate: date,
        unitPrice: priceMap.get(r.product_id) ?? 0,
      });
    }
  }
  // 정렬: 이름순(가나다) 또는 날짜순(마지막 출고일, 같은 날짜는 이름순 2차 정렬)
  const sortedAggs = Array.from(aggMap.values()).sort((a, b) =>
    sort === "date"
      ? a.lastDate.localeCompare(b.lastDate) ||
        a.name.localeCompare(b.name, "ko")
      : a.name.localeCompare(b.name, "ko"),
  );

  const items: SiteStatementItem[] = sortedAggs.map((a, idx) => ({
    no: idx + 1,
    date: a.lastDate,
    name: a.name,
    variant: a.variant,
    unit: a.unit,
    quantity: a.quantity,
    unitPrice: a.unitPrice,
    supply: a.quantity * a.unitPrice,
  }));

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
