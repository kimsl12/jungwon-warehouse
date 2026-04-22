import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import path from "node:path";

import { attachmentDispositionHeader, formatYmdCompact } from "@/lib/csv/generate";
import { createClient } from "@/lib/supabase/server";
import { productDisplayName } from "@/lib/product-display";
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
  const siteId = url.searchParams.get("site_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const recipientOverride = url.searchParams.get("recipient");
  const note = url.searchParams.get("note");

  let query = supabase
    .from("transactions")
    .select(
      `id, type, quantity, note, created_at, created_by,
       products!inner(name, category, unit, variant),
       sites(id, name, address)`,
    )
    .eq("type", "out")
    .order("created_at", { ascending: true })
    .limit(100);

  if (productId) query = query.eq("product_id", productId);
  if (userId) query = query.eq("created_by", userId);
  if (category) query = query.eq("products.category", category);
  if (siteId) query = query.eq("site_id", siteId);
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

  // Resolve user names for the PDF
  const userIds = Array.from(
    new Set(rows.map((r) => r.created_by).filter((id): id is string => Boolean(id))),
  );
  const profileNameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    for (const p of profileRows ?? []) profileNameMap.set(p.id, p.name);
  }

  const items: DeliveryItem[] = rows.map((tx, idx) => ({
    no: idx + 1,
    name: productDisplayName(tx.products?.name, tx.products?.variant),
    category: tx.products?.category ?? null,
    unit: tx.products?.unit ?? null,
    quantity: tx.quantity,
    note: tx.note,
    siteName: tx.sites?.name ?? null,
    userName: tx.created_by ? (profileNameMap.get(tx.created_by) ?? null) : null,
    date: new Date(tx.created_at).toISOString().slice(0, 10),
  }));

  // Auto-determine recipient from site info. If all rows share the same
  // site, use that as the 수신처. Otherwise use "여러 현장" or override.
  const distinctSites = new Map<string, { name: string; address: string | null }>();
  for (const row of rows) {
    if (row.sites?.id) {
      distinctSites.set(row.sites.id, { name: row.sites.name, address: row.sites.address ?? null });
    }
  }
  let recipient = recipientOverride;
  if (!recipient && distinctSites.size === 1) {
    const site = Array.from(distinctSites.values())[0];
    recipient = site.address ? `${site.name} (${site.address})` : site.name;
  } else if (!recipient && distinctSites.size > 1) {
    recipient = `여러 현장 (${distinctSites.size}곳)`;
  }

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
