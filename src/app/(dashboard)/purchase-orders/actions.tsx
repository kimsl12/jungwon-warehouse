"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isFaxConfigured, sendFax } from "@/lib/fax";
import { createClient } from "@/lib/supabase/server";
import { PurchaseOrderPdf, type PurchaseOrderPdfItem } from "@/templates/purchase-order-pdf";

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

const poFaxSchema = z.object({
  po_id: z.string().uuid(),
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

// -----------------------------------------------------------------------------
// sendPurchaseOrderFax — 발주서를 PDF로 렌더한 뒤 팩스 API로 전송
// -----------------------------------------------------------------------------
export async function sendPurchaseOrderFax(
  formData: FormData,
): Promise<{ error: string | null; ok?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  if (!isFaxConfigured()) {
    return {
      error:
        "팩스 API가 설정되지 않았습니다. 관리자에게 환경변수 등록을 요청하세요 " +
        "(FAX_API_BASE_URL, FAX_API_KEY, FAX_SENDER_NUMBER).",
    };
  }

  const parsed = poFaxSchema.safeParse({ po_id: formData.get("po_id") });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const { data: po, error } = await auth.supabase
    .from("purchase_orders")
    .select(
      `id, po_number, order_date, due_date,
       payment_terms, delivery_terms, inspection_terms,
       ship_to, ship_to_contact, note,
       vendor:vendors!inner(name, address, contact_phone, fax)`,
    )
    .eq("id", parsed.data.po_id)
    .single();
  if (error || !po) return { error: "발주서를 찾을 수 없습니다." };

  if (!po.vendor?.fax) {
    return { error: "거래처의 팩스번호가 등록되어 있지 않습니다. 거래처 정보에서 팩스번호를 추가하세요." };
  }

  const { data: items } = await auth.supabase
    .from("purchase_order_items")
    .select(
      "id, product_name, product_variant, spec, unit, ordered_quantity, unit_price, note, sort_order",
    )
    .eq("purchase_order_id", po.id)
    .order("sort_order");

  const pdfItems: PurchaseOrderPdfItem[] = (items ?? []).map((it, i) => ({
    no: i + 1,
    name: it.product_name,
    variant: it.product_variant,
    spec: it.spec,
    unit: it.unit,
    quantity: it.ordered_quantity,
    unit_price: it.unit_price,
    note: it.note,
  }));

  const pdfBuffer = await renderToBuffer(
    <PurchaseOrderPdf
      poNumber={po.po_number}
      orderDate={po.order_date}
      dueDate={po.due_date}
      vendor={{
        name: po.vendor.name,
        address: po.vendor.address ?? null,
        contact_phone: po.vendor.contact_phone ?? null,
        fax: po.vendor.fax ?? null,
      }}
      items={pdfItems}
      paymentTerms={po.payment_terms}
      deliveryTerms={po.delivery_terms}
      inspectionTerms={po.inspection_terms}
      shipTo={po.ship_to}
      shipToContact={po.ship_to_contact}
      note={po.note}
    />,
  );

  const result = await sendFax({
    toFaxNumber: po.vendor.fax,
    pdfBuffer: new Uint8Array(pdfBuffer),
    subject: `발주서 ${po.po_number}`,
  });

  if (!result.ok) {
    return {
      error:
        result.error === "NOT_IMPLEMENTED"
          ? result.detail ?? "팩스 API 연동 코드가 아직 활성화되지 않았습니다."
          : `팩스 전송 실패: ${result.error}${result.detail ? " · " + result.detail : ""}`,
    };
  }

  // 발주서가 draft 면 sent 로 자동 전이
  await auth.supabase.rpc("update_purchase_order_status", {
    p_po_id: po.id,
    p_status: "sent",
  });

  revalidatePath(`/purchase-orders/${po.id}`);
  return { error: null, ok: true };
}
