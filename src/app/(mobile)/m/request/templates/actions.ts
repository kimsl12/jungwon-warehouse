"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  isValidVariableName,
  validateFormula,
} from "@/lib/template-formula";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────
const templateVariableSchema = z.object({
  name: z.string().trim().min(1).max(20),
  label: z.string().trim().min(1).max(40),
  unit: z.string().trim().max(10).optional().nullable(),
  default: z.coerce.number().min(0).default(0),
});

const templateItemSchema = z
  .object({
    product_id: z.string().uuid(),
    requested_quantity: z.coerce.number().int().min(0).optional().nullable(),
    formula: z.string().trim().max(200).optional().nullable(),
    note: z.string().trim().max(200).nullable().optional(),
  })
  .refine(
    (it) => {
      const hasQty =
        typeof it.requested_quantity === "number" && it.requested_quantity >= 0;
      const hasFormula = typeof it.formula === "string" && it.formula.length > 0;
      return hasQty !== hasFormula; // 정확히 하나만
    },
    { message: "각 자재는 고정 수량 또는 수식 중 하나만 지정해야 합니다." },
  );

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "템플릿 이름을 입력해주세요.").max(60),
  note: z.string().trim().max(300).nullable().optional(),
  items: z.array(templateItemSchema).min(1, "최소 1개 이상의 자재를 추가해주세요."),
  is_public: z.boolean().optional().default(false),
  category: z.string().trim().max(40).optional().nullable(),
  subcategory: z.string().trim().max(60).optional().nullable(),
  variables: z.array(templateVariableSchema).max(5).optional().nullable(),
});

const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().uuid(),
});

export type CreateTemplateInput = z.input<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.input<typeof updateTemplateSchema>;
export type TemplateVariable = z.infer<typeof templateVariableSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function validateVariablesAndFormulas(
  variables: TemplateVariable[] | null | undefined,
  items: z.infer<typeof templateItemSchema>[],
): { ok: true } | { ok: false; error: string } {
  // 변수 이름 검증
  const seen = new Set<string>();
  const declared: string[] = [];
  for (const v of variables ?? []) {
    if (!isValidVariableName(v.name)) {
      return {
        ok: false,
        error: `변수 이름 '${v.name}' 이 잘못됐습니다 (영문 시작, 영문/숫자/_, 예약 함수명 제외).`,
      };
    }
    if (seen.has(v.name)) {
      return { ok: false, error: `변수 이름 '${v.name}' 이 중복됐습니다.` };
    }
    seen.add(v.name);
    declared.push(v.name);
  }

  // 각 item 의 formula 검증
  for (const it of items) {
    if (typeof it.formula === "string" && it.formula.length > 0) {
      const r = validateFormula(it.formula, declared);
      if (!r.ok) {
        return { ok: false, error: `수식 '${it.formula}' 검증 실패: ${r.error}` };
      }
    }
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────
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

  const v = validateVariablesAndFormulas(
    parsed.data.variables ?? null,
    parsed.data.items,
  );
  if (!v.ok) return { error: v.error };

  // 개인 템플릿은 카테고리/변수 무시
  const isPublic = parsed.data.is_public ?? false;

  const { data, error } = await supabase
    .from("request_templates")
    .insert({
      name: parsed.data.name,
      note: parsed.data.note ?? null,
      items: parsed.data.items as unknown as never,
      is_public: isPublic,
      owner_id: isPublic ? null : user.id,
      created_by: user.id,
      category: isPublic ? (parsed.data.category?.trim() || null) : null,
      subcategory: isPublic ? (parsed.data.subcategory?.trim() || null) : null,
      variables:
        isPublic && parsed.data.variables && parsed.data.variables.length > 0
          ? (parsed.data.variables as unknown as never)
          : null,
    })
    .select("id")
    .single();

  if (error) return { error: "템플릿 생성 실패: " + error.message };

  revalidatePath("/m/request");
  revalidatePath("/m/request/new");
  revalidatePath("/m/request/templates");
  revalidatePath("/requests/templates");
  return { error: null, id: data.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────
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

  const v = validateVariablesAndFormulas(
    parsed.data.variables ?? null,
    parsed.data.items,
  );
  if (!v.ok) return { error: v.error };

  const isPublic = parsed.data.is_public ?? false;

  const { error } = await supabase
    .from("request_templates")
    .update({
      name: parsed.data.name,
      note: parsed.data.note ?? null,
      items: parsed.data.items as unknown as never,
      is_public: isPublic,
      owner_id: isPublic ? null : user.id,
      category: isPublic ? (parsed.data.category?.trim() || null) : null,
      subcategory: isPublic ? (parsed.data.subcategory?.trim() || null) : null,
      variables:
        isPublic && parsed.data.variables && parsed.data.variables.length > 0
          ? (parsed.data.variables as unknown as never)
          : null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "템플릿 수정 실패: " + error.message };

  revalidatePath("/m/request");
  revalidatePath("/m/request/new");
  revalidatePath("/m/request/templates");
  revalidatePath("/requests/templates");
  return { error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────
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

  const { error } = await supabase
    .from("request_templates")
    .delete()
    .eq("id", templateId);

  if (error) return { error: "삭제 실패: " + error.message };

  revalidatePath("/m/request/templates");
  revalidatePath("/m/request/new");
  revalidatePath("/requests/templates");
  return { error: null };
}
