"use server";

import { revalidatePath } from "next/cache";

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
