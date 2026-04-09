import { NextResponse } from "next/server";

import {
  attachmentDispositionHeader,
  formatYmdCompact,
  rowsToCsv,
} from "@/lib/csv/generate";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * GET /api/export/transactions
 *
 * Honours the same query params as /transactions page so users can export
 * exactly what they're filtering on the screen.
 *
 *   type, product_id, user_id, category, from, to
 *
 * Filename: 정원창고_입출고내역_YYYYMMDD.csv
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
  const type = url.searchParams.get("type");
  const productId = url.searchParams.get("product_id");
  const userId = url.searchParams.get("user_id");
  const category = url.searchParams.get("category");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("transactions")
    .select(
      `id, type, quantity, note, created_at, created_by,
       products!inner(name, category, unit)`,
    )
    .order("created_at", { ascending: false });

  if (type === "in" || type === "out") query = query.eq("type", type);
  if (productId) query = query.eq("product_id", productId);
  if (userId) query = query.eq("created_by", userId);
  if (category) query = query.eq("products.category", category);
  if (from) query = query.gte("created_at", from);
  if (to) {
    const endOfDay = new Date(to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return new NextResponse(`Failed to fetch transactions: ${error.message}`, { status: 500 });
  }

  // Resolve user names for the visible rows
  const userIds = Array.from(
    new Set((data ?? []).map((t) => t.created_by).filter((id): id is string => Boolean(id))),
  );
  const profileNameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    for (const p of profileRows ?? []) profileNameMap.set(p.id, p.name);
  }

  const headers = ["일시", "구분", "제품명", "분류", "단위", "수량", "담당자", "메모"];
  const rows = (data ?? []).map((tx) => [
    dateFormatter.format(new Date(tx.created_at)),
    tx.type === "in" ? "입고" : "출고",
    tx.products?.name ?? "",
    tx.products?.category ?? "",
    tx.products?.unit ?? "",
    tx.quantity,
    tx.created_by ? (profileNameMap.get(tx.created_by) ?? "") : "",
    tx.note ?? "",
  ]);

  const csv = rowsToCsv(headers, rows);
  const filename = `정원창고_입출고내역_${formatYmdCompact()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": attachmentDispositionHeader(filename),
      "Cache-Control": "no-store",
    },
  });
}
