"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------
const itemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().trim().min(1),
  product_variant: z.string().trim().optional().nullable(),
  spec: z.string().trim().optional().nullable(),
  unit: z.string().trim().optional().nullable(),
  ordered_quantity: z.coerce.number().int().min(1, "수량은 1 이상이어야 합니다."),
  unit_price: z.coerce.number().int().min(0).default(0),
  note: z.string().trim().max(200).optional().nullable(),
});

const poCreateSchema = z.object({
  vendor_id: z.string().uuid({ message: "거래처를 선택해주세요." }),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "올바른 작성일을 입력해주세요."),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  payment_terms: z.string().trim().optional().or(z.literal("")),
  delivery_terms: z.string().trim().optional().or(z.literal("")),
  inspection_terms: z.string().trim().optional().or(z.literal("")),
  ship_to: z.string().trim().optional().or(z.literal("")),
  ship_to_contact: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["draft", "sent"]).default("draft"),
  items: z.array(itemSchema).min(1, "최소 1개 이상의 품목을 추가해주세요."),
});

const poReceiveSchema = z.object({
  po_id: z.string().uuid(),
  receipts: z.array(
    z.object({
      item_id: z.string().uuid(),
      received_quantity: z.coerce.number().int().min(0),
    }),
  ),
});

const poStatusSchema = z.object({
  po_id: z.string().uuid(),
  status: z.enum(["sent", "canceled"]),
});

export type PoFormState = {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
  po_id?: string;
} | null;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
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

function emptyToNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

// -----------------------------------------------------------------------------
// createPurchaseOrder — JSON payload 수용 (items 배열)
// -----------------------------------------------------------------------------
export async function createPurchaseOrder(payload: unknown): Promise<PoFormState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = poCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>,
    };
  }

  const data = parsed.data;

  // Supabase generated types mark nullable RPC args (DB DEFAULT NULL) as required
  // `string`. Postgres still accepts NULL at runtime — cast to satisfy the
  // compiler while sending real NULLs over the wire.
  const asArg = (v: string | null): string => v as unknown as string;

  const { data: poId, error } = await auth.supabase.rpc("create_purchase_order", {
    p_vendor_id: data.vendor_id,
    p_order_date: data.order_date,
    p_due_date: asArg(data.due_date ? data.due_date : null),
    p_payment_terms: asArg(emptyToNull(data.payment_terms)),
    p_delivery_terms: asArg(emptyToNull(data.delivery_terms)),
    p_inspection_terms: asArg(emptyToNull(data.inspection_terms)),
    p_ship_to: asArg(emptyToNull(data.ship_to)),
    p_ship_to_contact: asArg(emptyToNull(data.ship_to_contact)),
    p_note: asArg(emptyToNull(data.note)),
    p_items: data.items.map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      product_variant: emptyToNull(it.product_variant),
      spec: emptyToNull(it.spec),
      unit: emptyToNull(it.unit),
      ordered_quantity: it.ordered_quantity,
      unit_price: it.unit_price,
      note: emptyToNull(it.note),
    })),
    p_user_id: auth.user.id,
    p_status: data.status,
  });

  if (error) {
    return { error: "발주서 저장 실패: " + error.message };
  }

  revalidatePath("/purchase-orders");
  return { error: null, success: true, po_id: poId as unknown as string };
}

// -----------------------------------------------------------------------------
// updatePurchaseOrderStatus — 발송/취소
// -----------------------------------------------------------------------------
export async function updatePurchaseOrderStatus(
  formData: FormData,
): Promise<{ error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = poStatusSchema.safeParse({
    po_id: formData.get("po_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const { error } = await auth.supabase.rpc("update_purchase_order_status", {
    p_po_id: parsed.data.po_id,
    p_status: parsed.data.status,
  });

  if (error) return { error: "상태 변경 실패: " + error.message };

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${parsed.data.po_id}`);
  return { error: null };
}

// -----------------------------------------------------------------------------
// receivePurchaseOrder — 부분 수령 처리
// -----------------------------------------------------------------------------
export async function receivePurchaseOrder(payload: unknown): Promise<{
  error: string | null;
  result?: { status: string; fulfilled_items: number; total_items: number };
}> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = poReceiveSchema.safeParse(payload);
  if (!parsed.success) return { error: "잘못된 입력값입니다." };

  // 모두 0이면 무시
  const nonZero = parsed.data.receipts.filter((r) => r.received_quantity > 0);
  if (nonZero.length === 0) {
    return { error: "입고할 수량을 1 이상 입력해주세요." };
  }

  const { data, error } = await auth.supabase.rpc("receive_purchase_order_items", {
    p_po_id: parsed.data.po_id,
    p_receipts: nonZero,
    p_user_id: auth.user.id,
  });

  if (error) {
    if (error.message.includes("OVER_RECEIPT")) {
      return { error: "입고 수량이 발주 수량을 초과합니다." };
    }
    if (error.message.includes("PO_NOT_RECEIVABLE")) {
      return { error: "발주서 상태가 입고 처리 가능 상태가 아닙니다." };
    }
    return { error: "입고 처리 실패: " + error.message };
  }

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${parsed.data.po_id}`);
  revalidatePath("/inventory");
  revalidatePath("/overview");
  return {
    error: null,
    result: data as unknown as { status: string; fulfilled_items: number; total_items: number },
  };
}
