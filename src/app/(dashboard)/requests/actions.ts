"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tryNotifyLowStock } from "@/lib/push/low-stock";
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
  if (profile?.role !== "admin") {
    return { ok: false as const, error: "관리자 권한이 필요합니다.", supabase };
  }
  return { ok: true as const, user, supabase };
}

const uuid = z.string().uuid();

function mapRpcError(msg: string, fallbackPrefix: string): string {
  if (msg.includes("NOT_AUTHORIZED")) return "관리자 권한이 필요합니다.";
  if (msg.includes("REQUEST_NOT_FOUND")) return "신청을 찾을 수 없습니다.";
  if (msg.includes("INVALID_TRANSITION")) return "현재 상태에서는 수행할 수 없습니다.";
  if (msg.includes("REQUEST_NOT_APPROVED")) return "승인된 신청만 출고 처리할 수 있습니다.";
  if (msg.includes("OVER_FULFILLMENT")) return "요청 수량을 초과할 수 없습니다.";
  if (msg.includes("INSUFFICIENT_STOCK")) return "재고가 부족합니다.";
  if (msg.includes("ITEM_NOT_FOUND")) return "아이템을 찾을 수 없습니다.";
  return `${fallbackPrefix}: ${msg}`;
}

// -----------------------------------------------------------------------------
// 승인
// -----------------------------------------------------------------------------
export async function approveMaterialRequest(
  requestId: string,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  if (!uuid.safeParse(requestId).success) return { error: "잘못된 요청입니다." };

  const { error } = await auth.supabase.rpc("approve_material_request", {
    p_request_id: requestId,
  });

  if (error) return { error: mapRpcError(error.message, "승인 실패") };

  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/m/request");
  revalidatePath(`/m/request/${requestId}`);
  return { error: null };
}

// -----------------------------------------------------------------------------
// 거절
// -----------------------------------------------------------------------------
const rejectSchema = z.object({
  request_id: uuid,
  reason: z.string().trim().min(1, "거절 사유를 입력해주세요.").max(500),
});

export async function rejectMaterialRequest(
  requestId: string,
  reason: string,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = rejectSchema.safeParse({ request_id: requestId, reason });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." };
  }

  const { error } = await auth.supabase.rpc("reject_material_request", {
    p_request_id: parsed.data.request_id,
    p_reason: parsed.data.reason,
  });

  if (error) return { error: mapRpcError(error.message, "거절 실패") };

  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/m/request");
  revalidatePath(`/m/request/${requestId}`);
  return { error: null };
}

// -----------------------------------------------------------------------------
// 부분 출고 처리 — 각 item별 quantity 만큼 process_transaction('out') 호출.
// -----------------------------------------------------------------------------
const fulfillSchema = z.object({
  request_id: uuid,
  fulfillments: z
    .array(
      z.object({
        item_id: uuid,
        quantity: z.number().int().min(1, "수량은 1 이상이어야 합니다."),
      }),
    )
    .min(1, "출고할 아이템이 없습니다."),
});

export type FulfillInput = z.input<typeof fulfillSchema>;

export type FulfillResult =
  | {
      ok: true;
      status: string;
      fulfilled_items: number;
      total_items: number;
    }
  | { ok: false; error: string };

export async function fulfillMaterialRequest(
  input: FulfillInput,
): Promise<FulfillResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = fulfillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." };
  }

  const { data, error } = await auth.supabase.rpc("fulfill_material_request_items", {
    p_request_id: parsed.data.request_id,
    p_fulfillments: parsed.data.fulfillments as unknown as never,
    p_user_id: auth.user.id,
  });

  if (error) return { ok: false, error: mapRpcError(error.message, "출고 처리 실패") };

  const result = data as unknown as {
    status: string;
    fulfilled_items: number;
    total_items: number;
  };

  revalidatePath("/requests");
  revalidatePath(`/requests/${parsed.data.request_id}`);
  revalidatePath("/m/request");
  revalidatePath(`/m/request/${parsed.data.request_id}`);
  revalidatePath("/inventory");
  revalidatePath("/transactions");

  // fulfill 로 출고된 품목 중 재고 부족 진입한 것이 있으면 admin 푸시.
  // tryNotifyLowStock 가 KST 일별 디듀프 + 현재 부족 여부 재확인 자체 처리.
  try {
    const { data: items } = await auth.supabase
      .from("material_request_items")
      .select("product_id")
      .in(
        "id",
        parsed.data.fulfillments.map((f) => f.item_id),
      );
    const productIds = Array.from(
      new Set((items ?? []).map((i) => i.product_id as string)),
    );
    await Promise.all(
      productIds.map((pid) =>
        tryNotifyLowStock(pid).catch((e) =>
          console.error("[push] 재고 부족 알림 실패:", e),
        ),
      ),
    );
  } catch (e) {
    console.error("[push] fulfill 후 재고 부족 알림 검사 실패:", e);
  }

  return {
    ok: true,
    status: result.status,
    fulfilled_items: result.fulfilled_items,
    total_items: result.total_items,
  };
}

// -----------------------------------------------------------------------------
// 관리자에 의한 취소 (user가 취소 못하는 approved 상태도 취소 가능)
// -----------------------------------------------------------------------------
export async function adminCancelMaterialRequest(
  requestId: string,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  if (!uuid.safeParse(requestId).success) return { error: "잘못된 요청입니다." };

  const { error } = await auth.supabase.rpc("cancel_material_request", {
    p_request_id: requestId,
  });

  if (error) return { error: mapRpcError(error.message, "취소 실패") };

  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/m/request");
  revalidatePath(`/m/request/${requestId}`);
  return { error: null };
}

// -----------------------------------------------------------------------------
// 삭제 — canceled / rejected 상태의 신청만 admin 이 영구 삭제 가능.
// 출고 이력이 남는 fulfilled / 진행 중인 submitted·approved 는 차단.
// material_request_items 는 ON DELETE CASCADE 로 함께 삭제됨.
// -----------------------------------------------------------------------------
export async function deleteMaterialRequest(
  requestId: string,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  if (!uuid.safeParse(requestId).success) return { error: "잘못된 요청입니다." };

  const { data: req, error: fetchError } = await auth.supabase
    .from("material_requests")
    .select("status, site_id")
    .eq("id", requestId)
    .single();

  if (fetchError || !req) return { error: "신청을 찾을 수 없습니다." };

  if (req.status !== "canceled" && req.status !== "rejected") {
    return {
      error:
        "취소·거절된 신청만 삭제할 수 있습니다. 먼저 신청을 취소·거절하세요.",
    };
  }

  const { error } = await auth.supabase
    .from("material_requests")
    .delete()
    .eq("id", requestId);

  if (error) return { error: `삭제 실패: ${error.message}` };

  revalidatePath("/requests");
  revalidatePath("/m/request");
  if (req.site_id) revalidatePath(`/sites/${req.site_id}`);
  return { error: null };
}
