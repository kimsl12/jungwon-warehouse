"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { callProcessTransaction } from "@/lib/supabase/rpc";
import { createClient } from "@/lib/supabase/server";

const processTransactionSchema = z
  .object({
    product_id: z.string().uuid(),
    type: z.enum(["in", "out", "loss"]),
    quantity: z.coerce.number().int().positive("수량은 1 이상이어야 합니다."),
    note: z.string().trim().max(500).optional().or(z.literal("")),
    site_id: z.string().uuid().optional().or(z.literal("")),
  })
  .refine((data) => data.type !== "out" || (data.site_id && data.site_id.length > 0), {
    message: "출고는 현장을 선택해주세요.",
    path: ["site_id"],
  });

export type ProcessTransactionState = {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
  lowStock?: boolean;
  newQuantity?: number;
} | null;

/**
 * Wrap the process_transaction RPC. Maps DB exceptions to friendly Korean
 * error messages per CLAUDE.md spec.
 */
export async function processTransaction(
  _prev: ProcessTransactionState,
  formData: FormData,
): Promise<ProcessTransactionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const parsed = processTransactionSchema.safeParse({
    product_id: formData.get("product_id"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
    site_id: formData.get("site_id"),
  });

  if (!parsed.success) {
    return {
      error: "입력값을 확인해주세요.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { data, error } = await callProcessTransaction(supabase, {
    p_product_id: parsed.data.product_id,
    p_type: parsed.data.type,
    p_quantity: parsed.data.quantity,
    p_note: parsed.data.note?.trim() || null,
    p_user_id: user.id,
    p_site_id: parsed.data.site_id && parsed.data.site_id.length > 0 ? parsed.data.site_id : null,
  });

  if (error) {
    // Map DB exceptions to Korean messages
    const msg = error.message ?? "";
    if (msg.includes("INSUFFICIENT_STOCK")) {
      return { error: "재고가 부족합니다. 현재 수량을 확인해주세요." };
    }
    if (msg.includes("PRODUCT_NOT_FOUND")) {
      return { error: "품목을 찾을 수 없습니다." };
    }
    if (msg.includes("SITE_REQUIRED")) {
      return { error: "출고는 현장을 선택해주세요." };
    }
    if (msg.includes("SITE_NOT_FOUND_OR_INACTIVE")) {
      return { error: "선택한 현장이 비활성화되었거나 존재하지 않습니다." };
    }
    if (msg.includes("INVALID_TYPE") || msg.includes("INVALID_QUANTITY")) {
      return { error: "잘못된 입력값입니다." };
    }
    return { error: "처리에 실패했습니다: " + msg };
  }

  const result = data as { new_quantity: number; low_stock: boolean } | null;

  revalidatePath("/inventory");
  revalidatePath("/transactions");
  revalidatePath("/overview");

  return {
    error: null,
    success: true,
    lowStock: result?.low_stock ?? false,
    newQuantity: result?.new_quantity,
  };
}
