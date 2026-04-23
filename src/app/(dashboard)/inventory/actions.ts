"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------
const productCreateSchema = z.object({
  name: z.string().trim().min(1, "제품명을 입력해주세요."),
  category: z.string().trim().optional().or(z.literal("")),
  subcategory: z.string().trim().optional().or(z.literal("")),
  variant: z.string().trim().optional().or(z.literal("")),
  unit: z.string().trim().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(0, "수량은 0 이상이어야 합니다."),
  min_quantity: z.coerce.number().int().min(0, "최소수량은 0 이상이어야 합니다."),
  location: z.string().trim().optional().or(z.literal("")),
});

const productUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "제품명을 입력해주세요."),
  category: z.string().trim().optional().or(z.literal("")),
  subcategory: z.string().trim().optional().or(z.literal("")),
  variant: z.string().trim().optional().or(z.literal("")),
  unit: z.string().trim().optional().or(z.literal("")),
  min_quantity: z.coerce.number().int().min(0, "최소수량은 0 이상이어야 합니다."),
  location: z.string().trim().optional().or(z.literal("")),
});

const productDeleteSchema = z.object({
  id: z.string().uuid(),
});

// -----------------------------------------------------------------------------
// State types
// -----------------------------------------------------------------------------
export type ProductFormState = {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
} | null;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "로그인이 필요합니다.", supabase };
  }
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

// -----------------------------------------------------------------------------
// createProduct
// -----------------------------------------------------------------------------
export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = productCreateSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    subcategory: formData.get("subcategory"),
    variant: formData.get("variant"),
    unit: formData.get("unit"),
    quantity: formData.get("quantity"),
    min_quantity: formData.get("min_quantity"),
    location: formData.get("location"),
  });

  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const normalizedVariant = emptyToNull(parsed.data.variant ?? null);

  // (name, variant) 조합 중복 검사.
  // variant가 null인 경우 PostgREST의 기본 "eq"로는 NULL 매칭이 안 되므로
  // is("variant", null) 분기를 사용한다. bulk_import_products RPC의 SQL 규칙과 동일.
  {
    let dupQuery = auth.supabase
      .from("products")
      .select("id", { head: true, count: "exact" })
      .eq("name", parsed.data.name);
    dupQuery = normalizedVariant === null
      ? dupQuery.is("variant", null)
      : dupQuery.eq("variant", normalizedVariant);
    const { count: dupCount } = await dupQuery;
    if ((dupCount ?? 0) > 0) {
      return {
        error: normalizedVariant
          ? `이미 같은 품목(${parsed.data.name})의 변형 "${normalizedVariant}"이(가) 등록되어 있습니다.`
          : `이미 같은 이름(${parsed.data.name})의 품목이 등록되어 있습니다.`,
        fieldErrors: { variant: [normalizedVariant ? "중복된 변형" : "중복된 제품명"] },
      };
    }
  }

  const { data: inserted, error } = await auth.supabase
    .from("products")
    .insert({
      name: parsed.data.name,
      category: emptyToNull(parsed.data.category ?? null),
      subcategory: emptyToNull(parsed.data.subcategory ?? null),
      variant: normalizedVariant,
      unit: emptyToNull(parsed.data.unit ?? null),
      quantity: parsed.data.quantity,
      min_quantity: parsed.data.min_quantity,
      location: emptyToNull(parsed.data.location ?? null),
    })
    .select("id")
    .single();

  if (error) {
    return { error: "등록에 실패했습니다: " + error.message };
  }

  // Register aliases if provided (comma-separated)
  const aliasStr = String(formData.get("aliases") ?? "").trim();
  if (aliasStr && inserted?.id) {
    const aliases = [...new Set(aliasStr.split(",").map((a) => a.trim()).filter(Boolean))];
    if (aliases.length > 0) {
      await auth.supabase
        .from("product_aliases")
        .upsert(
          aliases.map((alias) => ({ product_id: inserted.id, alias })),
          { onConflict: "product_id,alias", ignoreDuplicates: true },
        );
    }
  }

  revalidatePath("/inventory");
  return { error: null, success: true };
}

// -----------------------------------------------------------------------------
// updateProduct
// -----------------------------------------------------------------------------
export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = productUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    category: formData.get("category"),
    subcategory: formData.get("subcategory"),
    variant: formData.get("variant"),
    unit: formData.get("unit"),
    min_quantity: formData.get("min_quantity"),
    location: formData.get("location"),
  });

  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { error } = await auth.supabase
    .from("products")
    .update({
      name: parsed.data.name,
      category: emptyToNull(parsed.data.category ?? null),
      subcategory: emptyToNull(parsed.data.subcategory ?? null),
      variant: emptyToNull(parsed.data.variant ?? null),
      unit: emptyToNull(parsed.data.unit ?? null),
      min_quantity: parsed.data.min_quantity,
      location: emptyToNull(parsed.data.location ?? null),
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "수정에 실패했습니다: " + error.message };
  }

  revalidatePath("/inventory");
  return { error: null, success: true };
}

// -----------------------------------------------------------------------------
// deleteProduct
// -----------------------------------------------------------------------------
export async function deleteProduct(formData: FormData): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = productDeleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { error: "잘못된 요청입니다." };
  }

  const { error } = await auth.supabase.from("products").delete().eq("id", parsed.data.id);

  if (error) {
    // Likely FK violation if there are transactions referencing it
    if (error.code === "23503") {
      return { error: "입출고 내역이 있는 품목은 삭제할 수 없습니다." };
    }
    return { error: "삭제에 실패했습니다: " + error.message };
  }

  revalidatePath("/inventory");
  return { error: null };
}
