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
  unit: z.string().trim().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(0, "수량은 0 이상이어야 합니다."),
  min_quantity: z.coerce.number().int().min(0, "최소수량은 0 이상이어야 합니다."),
  location: z.string().trim().optional().or(z.literal("")),
});

// On update, quantity is intentionally NOT included — quantity changes must
// go through the process_transaction RPC (Phase 5), per CLAUDE.md.
const productUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "제품명을 입력해주세요."),
  category: z.string().trim().optional().or(z.literal("")),
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

  const { error } = await auth.supabase.from("products").insert({
    name: parsed.data.name,
    category: emptyToNull(parsed.data.category ?? null),
    unit: emptyToNull(parsed.data.unit ?? null),
    quantity: parsed.data.quantity,
    min_quantity: parsed.data.min_quantity,
    location: emptyToNull(parsed.data.location ?? null),
  });

  if (error) {
    return { error: "등록에 실패했습니다: " + error.message };
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
