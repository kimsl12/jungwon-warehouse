"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------
const siteCreateSchema = z.object({
  name: z.string().trim().min(1, "현장명을 입력해주세요."),
  address: z.string().trim().optional().or(z.literal("")),
  contact: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const siteUpdateSchema = siteCreateSchema.extend({
  id: z.string().uuid(),
});

const siteToggleSchema = z.object({
  id: z.string().uuid(),
  active: z.coerce.boolean(),
});

const siteDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type SiteFormState = {
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
// createSite
// -----------------------------------------------------------------------------
export async function createSite(
  _prev: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = siteCreateSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    contact: formData.get("contact"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { error } = await auth.supabase.from("sites").insert({
    name: parsed.data.name,
    address: emptyToNull(parsed.data.address ?? null),
    contact: emptyToNull(parsed.data.contact ?? null),
    note: emptyToNull(parsed.data.note ?? null),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 등록된 현장명입니다." };
    }
    return { error: "등록에 실패했습니다: " + error.message };
  }

  revalidatePath("/sites");
  return { error: null, success: true };
}

// -----------------------------------------------------------------------------
// updateSite
// -----------------------------------------------------------------------------
export async function updateSite(
  _prev: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = siteUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    address: formData.get("address"),
    contact: formData.get("contact"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { error } = await auth.supabase
    .from("sites")
    .update({
      name: parsed.data.name,
      address: emptyToNull(parsed.data.address ?? null),
      contact: emptyToNull(parsed.data.contact ?? null),
      note: emptyToNull(parsed.data.note ?? null),
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 등록된 현장명입니다." };
    }
    return { error: "수정에 실패했습니다: " + error.message };
  }

  revalidatePath("/sites");
  return { error: null, success: true };
}

// -----------------------------------------------------------------------------
// toggleSiteActive — soft archive / unarchive
// -----------------------------------------------------------------------------
export async function toggleSiteActive(
  formData: FormData,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = siteToggleSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const { error } = await auth.supabase
    .from("sites")
    .update({ active: parsed.data.active })
    .eq("id", parsed.data.id);

  if (error) return { error: "변경에 실패했습니다: " + error.message };

  revalidatePath("/sites");
  return { error: null };
}

// -----------------------------------------------------------------------------
// deleteSite — hard delete (only succeeds if no transactions reference it)
// -----------------------------------------------------------------------------
export async function deleteSite(formData: FormData): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = siteDeleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const { error } = await auth.supabase.from("sites").delete().eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "이 현장으로 처리된 출고 내역이 있어 삭제할 수 없습니다. 비활성화하세요.",
      };
    }
    return { error: "삭제에 실패했습니다: " + error.message };
  }

  revalidatePath("/sites");
  return { error: null };
}
