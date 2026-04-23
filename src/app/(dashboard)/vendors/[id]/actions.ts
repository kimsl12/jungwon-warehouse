"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
