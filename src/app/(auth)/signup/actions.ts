"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type SignupState =
  | { error: string | null; success?: false }
  | { error: null; success: true; needsEmailConfirm: boolean };

export async function signup(
  _prevState: SignupState | null,
  formData: FormData,
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password || !name) {
    return { error: "이름, 이메일, 비밀번호를 모두 입력해주세요." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    return { error: "회원가입에 실패했습니다. " + error.message };
  }

  // If email confirmation is required, the session is null and the user
  // must verify the email link before they can log in.
  if (!data.session) {
    return { error: null, success: true, needsEmailConfirm: true };
  }

  revalidatePath("/", "layout");
  redirect("/overview");
}
