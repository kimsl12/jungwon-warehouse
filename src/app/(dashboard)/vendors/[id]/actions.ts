"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseVendorPricesCsv } from "@/lib/csv/parse-vendor-prices";
import { createClient } from "@/lib/supabase/server";

const priceUpsertSchema = z.object({
  vendor_id: z.string().uuid(),
  product_id: z.string().uuid(),
  unit_price: z.coerce.number().int().min(0, "단가는 0 이상이어야 합니다."),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

const priceDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type PriceFormState = {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
} | null;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다.", supabase };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { ok: false as const, error: "관리자 권한이 필요합니다.", supabase };
  }
  return { ok: true as const, user, supabase };
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

/**
 * 거래처에 품목-단가 조합을 추가하거나 (있으면) 갱신한다. UNIQUE 제약으로
 * 같은 (vendor, product) 조합은 한 행만 존재하며, onConflict upsert로 처리.
 */
export async function upsertVendorPrice(
  _prev: PriceFormState,
  formData: FormData,
): Promise<PriceFormState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = priceUpsertSchema.safeParse({
    vendor_id: formData.get("vendor_id"),
    product_id: formData.get("product_id"),
    unit_price: formData.get("unit_price"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { error } = await auth.supabase
    .from("vendor_product_prices")
    .upsert(
      {
        vendor_id: parsed.data.vendor_id,
        product_id: parsed.data.product_id,
        unit_price: parsed.data.unit_price,
        note: emptyToNull(parsed.data.note ?? null),
      },
      { onConflict: "vendor_id,product_id" },
    );

  if (error) {
    return { error: "저장에 실패했습니다: " + error.message };
  }

  revalidatePath(`/vendors/${parsed.data.vendor_id}`);
  return { error: null, success: true };
}

export async function deleteVendorPrice(
  formData: FormData,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = priceDeleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const { data: row } = await auth.supabase
    .from("vendor_product_prices")
    .select("vendor_id")
    .eq("id", parsed.data.id)
    .single();

  const { error } = await auth.supabase
    .from("vendor_product_prices")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { error: "삭제에 실패했습니다: " + error.message };

  if (row?.vendor_id) revalidatePath(`/vendors/${row.vendor_id}`);
  return { error: null };
}

// -----------------------------------------------------------------------------
// bulkUpsertVendorPrices — CSV 업로드 일괄 등록/갱신
// 매칭 전략: (name, variant IS NOT DISTINCT FROM v) 로 products 1건 탐색.
// - 매칭 0건: skipped (미등록 품목은 재고관리에 먼저 등록 필요)
// - 매칭 2건 이상: skipped (이상 케이스)
// - 매칭 1건: vendor_product_prices 에 upsert
// -----------------------------------------------------------------------------
export type BulkUpsertResult =
  | {
      ok: true;
      inserted: number;
      updated: number;
      skipped: number;
      warnings: string[];
      matchWarnings: string[];
    }
  | { ok: false; error: string };

export async function bulkUpsertVendorPrices(
  vendorId: string,
  csvText: string,
): Promise<BulkUpsertResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const uuidCheck = z.string().uuid().safeParse(vendorId);
  if (!uuidCheck.success) return { ok: false, error: "잘못된 거래처 식별자입니다." };

  const parsed = parseVendorPricesCsv(csvText);
  if (!parsed.ok) return parsed;

  const names = Array.from(new Set(parsed.rows.map((r) => r.product_name)));

  // 이름에 매칭되는 모든 후보 products (name → rows[])
  const { data: candidates, error: candidateErr } = await auth.supabase
    .from("products")
    .select("id, name, variant")
    .in("name", names);
  if (candidateErr) {
    return { ok: false, error: "품목 조회 실패: " + candidateErr.message };
  }

  const byName = new Map<string, { id: string; variant: string | null }[]>();
  for (const p of candidates ?? []) {
    const arr = byName.get(p.name) ?? [];
    arr.push({ id: p.id, variant: p.variant });
    byName.set(p.name, arr);
  }

  // 기존 등록된 단가 (vendor, product) 조회하여 insert/update 구분
  const { data: existingPrices } = await auth.supabase
    .from("vendor_product_prices")
    .select("product_id")
    .eq("vendor_id", vendorId);
  const existingSet = new Set((existingPrices ?? []).map((r) => r.product_id));

  const upserts: Array<{
    vendor_id: string;
    product_id: string;
    unit_price: number;
    note: string | null;
  }> = [];
  const matchWarnings: string[] = [];
  let skipped = 0;

  for (const row of parsed.rows) {
    const candidates_ = byName.get(row.product_name) ?? [];
    const matches = candidates_.filter((c) =>
      row.variant === null ? c.variant === null : c.variant === row.variant,
    );
    const label = row.variant ? `${row.product_name} · ${row.variant}` : row.product_name;
    if (matches.length === 0) {
      matchWarnings.push(`${row.lineNumber}행 (${label}): 재고 DB에 없는 품목 — 건너뜀`);
      skipped++;
      continue;
    }
    if (matches.length > 1) {
      matchWarnings.push(
        `${row.lineNumber}행 (${label}): 같은 이름·변형이 DB에 ${matches.length}건 — 건너뜀`,
      );
      skipped++;
      continue;
    }
    upserts.push({
      vendor_id: vendorId,
      product_id: matches[0].id,
      unit_price: row.unit_price,
      note: row.note,
    });
  }

  if (upserts.length > 0) {
    const { error: upsertErr } = await auth.supabase
      .from("vendor_product_prices")
      .upsert(upserts, { onConflict: "vendor_id,product_id" });
    if (upsertErr) {
      return { ok: false, error: "일괄 저장 실패: " + upsertErr.message };
    }
  }

  const inserted = upserts.filter((u) => !existingSet.has(u.product_id)).length;
  const updated = upserts.length - inserted;

  revalidatePath(`/vendors/${vendorId}`);
  return {
    ok: true,
    inserted,
    updated,
    skipped,
    warnings: parsed.warnings,
    matchWarnings,
  };
}
