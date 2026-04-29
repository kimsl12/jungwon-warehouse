"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const templateItemSchema = z.object({
  product_id: z.string().uuid(),
  requested_quantity: z.coerce.number().int().min(1),
  note: z.string().trim().max(200).nullable().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "템플릿 이름을 입력해주세요.").max(60),
  note: z.string().trim().max(300).nullable().optional(),
  items: z.array(templateItemSchema).min(1, "최소 1개 이상의 자재를 추가해주세요."),
  is_public: z.boolean().optional().default(false),
});

const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().uuid(),
});

export type CreateTemplateInput = z.input<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.input<typeof updateTemplateSchema>;

export async function createRequestTemplate(
  input: CreateTemplateInput,
): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  // is_public=true 는 admin만 가능 (RLS도 CHECK하지만 클라이언트 단에서도 확인)
  if (parsed.data.is_public) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return { error: "공용 템플릿은 관리자만 만들 수 있습니다." };
    }
  }

  const { data, error } = await supabase
    .from("request_templates")
    .insert({
      name: parsed.data.name,
      note: parsed.data.note ?? null,
      items: parsed.data.items as unknown as never,
      is_public: parsed.data.is_public ?? false,
      // 공용이면 owner_id = null (모두 공유), 개인이면 owner_id = 본인
      owner_id: parsed.data.is_public ? null : user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: "템플릿 생성 실패: " + error.message };

  revalidatePath("/m/request");
  revalidatePath("/m/request/new");
  revalidatePath("/m/request/templates");
  return { error: null, id: data.id };
}

export async function updateRequestTemplate(
  input: UpdateTemplateInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  if (parsed.data.is_public) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return { error: "공용 템플릿은 관리자만 수정할 수 있습니다." };
    }
  }

  const { error } = await supabase
    .from("request_templates")
    .update({
      name: parsed.data.name,
      note: parsed.data.note ?? null,
      items: parsed.data.items as unknown as never,
      is_public: parsed.data.is_public ?? false,
      owner_id: parsed.data.is_public ? null : user.id,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "템플릿 수정 실패: " + error.message };

  revalidatePath("/m/request");
  revalidatePath("/m/request/new");
  revalidatePath("/m/request/templates");
  revalidatePath("/requests/templates");
  return { error: null };
}

export async function deleteRequestTemplate(
  templateId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const uuidCheck = z.string().uuid().safeParse(templateId);
  if (!uuidCheck.success) return { error: "잘못된 요청입니다." };

  // RLS 가 권한 없는 삭제는 차단. 그래도 에러 메시지 친화적으로 처리.
  const { error } = await supabase
    .from("request_templates")
    .delete()
    .eq("id", templateId);

  if (error) return { error: "삭제 실패: " + error.message };

  revalidatePath("/m/request/templates");
  revalidatePath("/m/request/new");
  return { error: null };
}
