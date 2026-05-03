"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateUserRole(
  userId: string,
  newRole: "admin" | "user",
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_user_role", {
    p_user_id: userId,
    p_new_role: newRole,
  });

  if (error) {
    if (error.message.includes("ADMIN_REQUIRED")) {
      return { error: "관리자 권한이 필요합니다." };
    }
    if (error.message.includes("INVALID_ROLE")) {
      return { error: "유효하지 않은 역할입니다." };
    }
    if (error.message.includes("LAST_ADMIN")) {
      return { error: "마지막 관리자는 권한을 변경할 수 없습니다." };
    }
    return { error: "역할 변경에 실패했습니다: " + error.message };
  }

  revalidatePath("/users");
  return { error: null };
}

// -----------------------------------------------------------------------------
// 프로필 편집 — 이름 / 직급 / 연락처
// 본인은 항상 편집 가능, admin은 타인도 편집 가능 (RLS가 통제).
// -----------------------------------------------------------------------------
const profileUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().max(50).optional().or(z.literal("")),
  title: z.string().trim().max(30).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export type ProfileUpdateState = {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
} | null;

function emptyToNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

export async function updateUserProfile(
  _prev: ProfileUpdateState,
  formData: FormData,
): Promise<ProfileUpdateState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = profileUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    title: formData.get("title"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // 타인 편집은 admin 한정 (본인 편집은 항상 허용).
  if (parsed.data.id !== user.id) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (me?.role !== "admin") {
      return { error: "다른 사용자의 정보는 관리자만 수정할 수 있습니다." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name: emptyToNull(parsed.data.name ?? null),
      title: emptyToNull(parsed.data.title ?? null),
      phone: emptyToNull(parsed.data.phone ?? null),
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "저장 실패: " + error.message };
  }

  revalidatePath("/users");
  return { error: null, success: true };
}

// -----------------------------------------------------------------------------
// 사용자 영구 삭제 — auth.users 까지 제거. service_role 키 사용.
// profiles 는 ON DELETE CASCADE 로 함께 삭제, 작성자 FK 들 (transactions /
// purchase_orders / material_requests / activity_logs 등) 은 SET NULL 로 정리됨.
// -----------------------------------------------------------------------------
export async function deleteUser(
  userId: string,
): Promise<{ error: string | null }> {
  if (!z.string().uuid().safeParse(userId).success) {
    return { error: "잘못된 요청입니다." };
  }

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) return { error: "로그인이 필요합니다." };

  const { data: meProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();
  if (meProfile?.role !== "admin") {
    return { error: "관리자 권한이 필요합니다." };
  }

  if (userId === currentUser.id) {
    return { error: "자기 자신은 삭제할 수 없습니다." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  // 마지막 관리자 보호
  if (target.role === "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { error: "마지막 관리자 계정은 삭제할 수 없습니다." };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return { error: "삭제 실패: " + error.message };
  }

  revalidatePath("/users");
  revalidatePath("/sites");
  return { error: null };
}

