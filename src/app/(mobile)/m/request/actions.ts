"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { notifyNewMaterialRequest } from "@/lib/push/notify";
import { createClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// 현장 담당자(user) 또는 관리자(admin) — 자재 신청 작성
// -----------------------------------------------------------------------------

const itemSchema = z.object({
  product_id: z.string().uuid(),
  requested_quantity: z.coerce.number().int().min(1, "수량은 1 이상이어야 합니다."),
  note: z.string().trim().max(200).nullable().optional(),
});

const createSchema = z.object({
  site_id: z.string().uuid("현장을 선택해주세요."),
  note: z.string().trim().max(500).nullable().optional(),
  items: z.array(itemSchema).min(1, "최소 1개 이상의 자재를 추가해주세요."),
  is_urgent: z.boolean().optional().default(false),
  urgent_reason: z.string().trim().max(200).nullable().optional(),
});

export type CreateRequestInput = z.input<typeof createSchema>;

export type CreateRequestResult =
  | { ok: true; request_id: string }
  | { ok: false; error: string };

export async function createMaterialRequest(
  input: CreateRequestInput,
): Promise<CreateRequestResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "입력값을 확인해주세요." };
  }

  // Supabase type gen marks DEFAULT NULL args as required string; cast to
  // bypass the overly strict TS signature. Postgres still accepts NULL at runtime.
  const asArg = (v: string | null): string => v as unknown as string;

  const { data, error } = await supabase.rpc("create_material_request", {
    p_site_id: parsed.data.site_id,
    p_items: parsed.data.items as unknown as never,
    p_note: asArg(parsed.data.note ?? null),
    p_user_id: user.id,
    p_is_urgent: parsed.data.is_urgent ?? false,
    p_urgent_reason: asArg(parsed.data.urgent_reason ?? null),
  });

  if (error) {
    if (error.message.includes("SITE_NOT_ASSIGNED")) {
      return { ok: false, error: "배정되지 않은 현장입니다." };
    }
    if (error.message.includes("PRODUCT_NOT_FOUND")) {
      return { ok: false, error: "존재하지 않는 자재가 포함되어 있습니다." };
    }
    if (error.message.includes("ITEMS_REQUIRED")) {
      return { ok: false, error: "최소 1개 이상의 자재를 추가해주세요." };
    }
    return { ok: false, error: "신청 생성 실패: " + error.message };
  }

  revalidatePath("/m/request");
  revalidatePath("/requests");

  const requestId = data as unknown as string;

  // admin 전체에게 푸시 알림 — 실패해도 신청은 이미 성공이라 무시.
  try {
    const [siteResult, profileResult] = await Promise.all([
      supabase
        .from("sites")
        .select("name")
        .eq("id", parsed.data.site_id)
        .single(),
      supabase.from("profiles").select("name").eq("id", user.id).single(),
    ]);
    await notifyNewMaterialRequest({
      requestId,
      siteName: siteResult.data?.name ?? null,
      submitterName: profileResult.data?.name ?? null,
      itemCount: parsed.data.items.length,
      isUrgent: parsed.data.is_urgent ?? false,
    });
  } catch (e) {
    console.error("[push] 자재 신청 알림 발송 실패:", e);
  }

  return { ok: true, request_id: requestId };
}

// -----------------------------------------------------------------------------
// 신청 취소 — 본인(submitted만) 또는 관리자
// -----------------------------------------------------------------------------
export async function cancelMaterialRequest(
  requestId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const uuidCheck = z.string().uuid().safeParse(requestId);
  if (!uuidCheck.success) return { error: "잘못된 요청입니다." };

  const { error } = await supabase.rpc("cancel_material_request", {
    p_request_id: requestId,
  });

  if (error) {
    if (error.message.includes("NOT_AUTHORIZED")) {
      return { error: "취소 권한이 없습니다." };
    }
    if (error.message.includes("INVALID_TRANSITION")) {
      return { error: "현재 상태에서는 취소할 수 없습니다." };
    }
    return { error: "취소 실패: " + error.message };
  }

  revalidatePath("/m/request");
  revalidatePath(`/m/request/${requestId}`);
  revalidatePath("/requests");
  return { error: null };
}

// -----------------------------------------------------------------------------
// 자재 검색 — 신청 작성 화면에서 호출 (search_products RPC 래핑)
// -----------------------------------------------------------------------------
export async function searchProductsForRequest(
  query: string,
): Promise<
  Array<{
    id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    quantity: number;
    available: number;
    pending: number;
    category: string | null;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const { data } = await supabase
    .rpc("search_products", { p_query: trimmed, p_category: undefined })
    .select("id, name, variant, unit, quantity, category")
    .limit(200);

  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    quantity: number;
    category: string | null;
  }>;

  if (rows.length === 0) return [];

  const { data: availability } = await supabase.rpc("get_inventory_availability", {
    p_product_ids: rows.map((r) => r.id),
  });

  const availMap = new Map<string, { pending: number; available: number }>();
  for (const a of availability ?? []) {
    availMap.set(a.product_id, { pending: a.pending, available: a.available });
  }

  return rows.map((r) => {
    const a = availMap.get(r.id);
    return {
      ...r,
      available: a?.available ?? r.quantity,
      pending: a?.pending ?? 0,
    };
  });
}
