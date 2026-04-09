"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { callProcessTransaction } from "@/lib/supabase/rpc";
import { createClient } from "@/lib/supabase/server";

const processTransactionSchema = z.object({
  product_id: z.string().uuid(),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().int().positive("수량은 1 이상이어야 합니다."),
  note: z.string().trim().max(500).optional().or(z.literal("")),
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
