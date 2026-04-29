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
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const siteUpdateSchema = siteCreateSchema.extend({
  id: z.string().uuid(),
});

const assigneeIdsSchema = z.array(z.string().uuid());

const siteToggleSchema = z.object({
  id: z.string().uuid(),
  active: z.string().transform((v) => v === "true"),
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

function parseAssigneeIds(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    const result = assigneeIdsSchema.safeParse(parsed);
    return result.success ? Array.from(new Set(result.data)) : [];
  } catch {
    return [];
  }
}

type AdminSupabase = Awaited<ReturnType<typeof createClient>>;

async function syncSiteAssignees(
  supabase: AdminSupabase,
  adminId: string,
  siteId: string,
  userIds: string[],
): Promise<{ error: string | null }> {
  const { data: current, error: currentErr } = await supabase
    .from("profile_sites")
    .select("profile_id")
    .eq("site_id", siteId);
  if (currentErr) {
    return { error: "담당자 조회 실패: " + currentErr.message };
  }

  const currentSet = new Set((current ?? []).map((r) => r.profile_id));
  const targetSet = new Set(userIds);

  const toRemove = [...currentSet].filter((id) => !targetSet.has(id));
  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from("profile_sites")
      .delete()
      .eq("site_id", siteId)
      .in("profile_id", toRemove);
    if (delErr) return { error: "담당자 해제 실패: " + delErr.message };
  }

  const toAdd = [...targetSet].filter((id) => !currentSet.has(id));
  if (toAdd.length > 0) {
    const { error: addErr } = await supabase.from("profile_sites").insert(
      toAdd.map((profile_id) => ({
        profile_id,
        site_id: siteId,
        assigned_by: adminId,
      })),
    );
    if (addErr) return { error: "담당자 배정 실패: " + addErr.message };
  }

  return { error: null };
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
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const assigneeIds = parseAssigneeIds(formData.get("assignee_ids"));

  const { data: inserted, error } = await auth.supabase
    .from("sites")
    .insert({
      name: parsed.data.name,
      address: emptyToNull(parsed.data.address ?? null),
      note: emptyToNull(parsed.data.note ?? null),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 등록된 현장명입니다." };
    }
    return { error: "등록에 실패했습니다: " + error.message };
  }

  if (assigneeIds.length > 0) {
    const sync = await syncSiteAssignees(
      auth.supabase,
      auth.user.id,
      inserted.id,
      assigneeIds,
    );
    if (sync.error) return { error: sync.error };
  }

  revalidatePath("/sites");
  revalidatePath("/users");
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
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const assigneeIds = parseAssigneeIds(formData.get("assignee_ids"));

  const { error } = await auth.supabase
    .from("sites")
    .update({
      name: parsed.data.name,
      address: emptyToNull(parsed.data.address ?? null),
      note: emptyToNull(parsed.data.note ?? null),
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 등록된 현장명입니다." };
    }
    return { error: "수정에 실패했습니다: " + error.message };
  }

  const sync = await syncSiteAssignees(
    auth.supabase,
    auth.user.id,
    parsed.data.id,
    assigneeIds,
  );
  if (sync.error) return { error: sync.error };

  revalidatePath("/sites");
  revalidatePath("/users");
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
