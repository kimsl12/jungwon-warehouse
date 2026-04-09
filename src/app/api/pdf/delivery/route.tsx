import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import path from "node:path";

import { attachmentDispositionHeader, formatYmdCompact } from "@/lib/csv/generate";
import { createClient } from "@/lib/supabase/server";
import { DeliveryPdf, type DeliveryItem } from "@/templates/delivery-pdf";

/**
 * @react-pdf/renderer relies on Node APIs (fs, path) and a heavy
 * font/canvas pipeline. Edge runtime is not supported.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pdf/delivery?from=YYYY-MM-DD&to=YYYY-MM-DD&product_id=...&user_id=...&category=...&recipient=...&note=...
 *
 * Builds a single 출고장 PDF from outgoing transactions matching the
 * supplied filters. type is always forced to "out" — a 출고장 doesn't
 * include 입고 rows.
 *
 * Triggered from the /transactions page when the user is filtering an
 * outgoing range. The PDF is downloaded inline.
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
  const productId = url.searchParams.get("product_id");
  const userId = url.searchParams.get("user_id");
  const category = url.searchParams.get("category");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const recipient = url.searchParams.get("recipient");
  const note = url.searchParams.get("note");

  let query = supabase
    .from("transactions")
    .select(
      `id, type, quantity, note, created_at,
       products!inner(name, category, unit)`,
    )
    .eq("type", "out")
    .order("created_at", { ascending: true })
    .limit(100); // safety cap — a single delivery slip rarely has more

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

  const rows = data ?? [];
  if (rows.length === 0) {
    return new NextResponse("출고 내역이 없습니다.", { status: 404 });
  }

  const items: DeliveryItem[] = rows.map((tx, idx) => ({
    no: idx + 1,
    name: tx.products?.name ?? "—",
    category: tx.products?.category ?? null,
    unit: tx.products?.unit ?? null,
    quantity: tx.quantity,
    note: tx.note,
  }));

  const issueDate = new Date().toISOString().slice(0, 10);
  const slipNumber = `${formatYmdCompact()}-${rows[0].id.slice(0, 6).toUpperCase()}`;
  const logoPath = path.join(process.cwd(), "public", "jungwon-logo.png");

  const pdfBuffer = await renderToBuffer(
    <DeliveryPdf
      slipNumber={slipNumber}
      issueDate={issueDate}
      recipient={recipient}
      note={note}
      items={items}
      logoPath={logoPath}
    />,
  );

  const filename = `정원전기_출고장_${formatYmdCompact()}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentDispositionHeader(filename),
      "Cache-Control": "no-store",
    },
  });
}
