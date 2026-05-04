"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------
const vendorCreateSchema = z.object({
  name: z.string().trim().min(1, "상호를 입력해주세요."),
  ceo: z.string().trim().optional().or(z.literal("")),
  contact_person: z.string().trim().optional().or(z.literal("")),
  contact_phone: z.string().trim().optional().or(z.literal("")),
  fax: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  business_number: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const vendorUpdateSchema = vendorCreateSchema.extend({
  id: z.string().uuid(),
});

const vendorToggleSchema = z.object({
  id: z.string().uuid(),
  active: z.string().transform((v) => v === "true"),
});

const vendorDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type VendorFormState = {
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
// createVendor
// -----------------------------------------------------------------------------
export async function createVendor(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = vendorCreateSchema.safeParse({
    name: formData.get("name"),
    ceo: formData.get("ceo"),
    contact_person: formData.get("contact_person"),
    contact_phone: formData.get("contact_phone"),
    fax: formData.get("fax"),
    email: formData.get("email"),
    address: formData.get("address"),
    business_number: formData.get("business_number"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { error } = await auth.supabase.from("vendors").insert({
    name: parsed.data.name,
    ceo: emptyToNull(parsed.data.ceo ?? null),
    contact_person: emptyToNull(parsed.data.contact_person ?? null),
    contact_phone: emptyToNull(parsed.data.contact_phone ?? null),
    fax: emptyToNull(parsed.data.fax ?? null),
    email: emptyToNull(parsed.data.email ?? null),
    address: emptyToNull(parsed.data.address ?? null),
    business_number: emptyToNull(parsed.data.business_number ?? null),
    note: emptyToNull(parsed.data.note ?? null),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 등록된 거래처명입니다." };
    }
    return { error: "등록에 실패했습니다: " + error.message };
  }

  revalidatePath("/vendors");
  return { error: null, success: true };
}

// -----------------------------------------------------------------------------
// updateVendor
// -----------------------------------------------------------------------------
export async function updateVendor(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = vendorUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    ceo: formData.get("ceo"),
    contact_person: formData.get("contact_person"),
    contact_phone: formData.get("contact_phone"),
    fax: formData.get("fax"),
    email: formData.get("email"),
    address: formData.get("address"),
    business_number: formData.get("business_number"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { error } = await auth.supabase
    .from("vendors")
    .update({
      name: parsed.data.name,
      ceo: emptyToNull(parsed.data.ceo ?? null),
      contact_person: emptyToNull(parsed.data.contact_person ?? null),
      contact_phone: emptyToNull(parsed.data.contact_phone ?? null),
      fax: emptyToNull(parsed.data.fax ?? null),
      email: emptyToNull(parsed.data.email ?? null),
      address: emptyToNull(parsed.data.address ?? null),
      business_number: emptyToNull(parsed.data.business_number ?? null),
      note: emptyToNull(parsed.data.note ?? null),
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 등록된 거래처명입니다." };
    }
    return { error: "수정에 실패했습니다: " + error.message };
  }

  revalidatePath("/vendors");
  return { error: null, success: true };
}

// -----------------------------------------------------------------------------
// toggleVendorActive
// -----------------------------------------------------------------------------
export async function toggleVendorActive(
  formData: FormData,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = vendorToggleSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const { error } = await auth.supabase
    .from("vendors")
    .update({ active: parsed.data.active })
    .eq("id", parsed.data.id);

  if (error) return { error: "변경에 실패했습니다: " + error.message };

  revalidatePath("/vendors");
  return { error: null };
}

// -----------------------------------------------------------------------------
// deleteVendor — 발주 이력이 있으면 FK로 차단됨
// -----------------------------------------------------------------------------
export async function deleteVendor(formData: FormData): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = vendorDeleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const { error } = await auth.supabase.from("vendors").delete().eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "이 거래처의 발주 이력이 있어 삭제할 수 없습니다. 발주서 목록에서 작성중·취소 상태의 발주서를 삭제하거나, 진행/완료된 발주가 있다면 거래처를 비활성화하세요.",
      };
    }
    return { error: "삭제에 실패했습니다: " + error.message };
  }

  revalidatePath("/vendors");
  return { error: null };
}
