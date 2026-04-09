"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

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
  if (profile?.role !== "admin") return { ok: false as const, error: "관리자 권한이 필요합니다.", supabase };
  return { ok: true as const, supabase };
}

export async function addAlias(
  productId: string,
  alias: string,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const trimmed = alias.trim();
  if (!trimmed) return { error: "별칭을 입력해주세요." };
  if (trimmed.length > 100) return { error: "별칭은 100자 이내로 입력해주세요." };

  const { error } = await auth.supabase
    .from("product_aliases")
    .insert({ product_id: productId, alias: trimmed });

  if (error) {
    if (error.code === "23505") return { error: "이미 등록된 별칭입니다." };
    return { error: "별칭 추가에 실패했습니다: " + error.message };
  }

  revalidatePath("/inventory");
  return { error: null };
}

export async function removeAlias(aliasId: string): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase
    .from("product_aliases")
    .delete()
    .eq("id", aliasId);

  if (error) return { error: "별칭 삭제에 실패했습니다: " + error.message };

  revalidatePath("/inventory");
  return { error: null };
}

export async function fetchAliases(
  productId: string,
): Promise<{ id: string; alias: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_aliases")
    .select("id, alias")
    .eq("product_id", productId)
    .order("alias");
  return data ?? [];
}
