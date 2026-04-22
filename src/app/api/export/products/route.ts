import { NextResponse } from "next/server";

import {
  attachmentDispositionHeader,
  formatYmdCompact,
  rowsToCsv,
} from "@/lib/csv/generate";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export/products
 *
 * Streams the full product catalog as a CSV download. RLS lets any
 * authenticated user read products, so no extra role check is needed.
 *
 * Filename: 정원전기_재고목록_YYYYMMDD.csv
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("name, category, subcategory, variant, unit, quantity, min_quantity, location, updated_at")
    .order("name");

  if (error) {
    return new NextResponse(`Failed to fetch products: ${error.message}`, { status: 500 });
  }

  const headers = ["제품명", "분류", "소분류", "변형", "단위", "수량", "최소수량", "위치", "최종수정일"];
  const rows = (data ?? []).map((p) => [
    p.name,
    p.category ?? "",
    p.subcategory ?? "",
    p.variant ?? "",
    p.unit ?? "",
    p.quantity,
    p.min_quantity,
    p.location ?? "",
    new Date(p.updated_at).toISOString().slice(0, 10),
  ]);

  const csv = rowsToCsv(headers, rows);
  const filename = `정원전기_재고목록_${formatYmdCompact()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": attachmentDispositionHeader(filename),
      "Cache-Control": "no-store",
    },
  });
}
