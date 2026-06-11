"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null } | null;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.",
    };
  }

  revalidatePath("/", "layout");

  // 원래 가려던 경로가 있으면 그대로, 없으면 role 별 기본 경로
  // (현장 직원은 모바일 간편 모드, 관리자는 데스크톱 대시보드 — src/app/page.tsx 와 동일 규칙)
  if (next.startsWith("/")) redirect(next);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }
  redirect(role === "user" ? "/m/request" : "/overview");
}
