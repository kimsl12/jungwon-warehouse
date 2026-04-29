"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const auditSchema = z.object({
  product_id: z.string().uuid(),
  counted_quantity: z.number().int().min(0, "수량은 0 이상이어야 합니다."),
  mode: z.enum(["auto", "manual"]),
  note: z.string().trim().max(300).nullable().optional(),
});

export type AuditInput = z.input<typeof auditSchema>;

export type AuditResult =
  | {
      ok: true;
      audit_id: string;
      difference: number;
      resolution: string;
      adjustment_tx_id: string | null;
    }
  | { ok: false; error: string };

export async function recordStockAudit(input: AuditInput): Promise<AuditResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = auditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { data, error } = await supabase.rpc("record_stock_audit", {
    p_product_id: parsed.data.product_id,
    p_counted_quantity: parsed.data.counted_quantity,
    p_mode: parsed.data.mode,
    p_note: (parsed.data.note ?? null) as unknown as string,
  });

  if (error) {
    if (error.message.includes("NOT_AUTHORIZED"))
      return { ok: false, error: "관리자 권한이 필요합니다." };
    if (error.message.includes("PRODUCT_NOT_FOUND"))
      return { ok: false, error: "제품을 찾을 수 없습니다." };
    if (error.message.includes("INVALID_MODE"))
      return { ok: false, error: "잘못된 모드입니다." };
    if (error.message.includes("INVALID_QUANTITY"))
      return { ok: false, error: "수량은 0 이상이어야 합니다." };
    return { ok: false, error: "실사 기록 실패: " + error.message };
  }

  revalidatePath("/m/audit");
  revalidatePath("/inventory");

  const result = data as unknown as {
    audit_id: string;
    difference: number;
    resolution: string;
    adjustment_tx_id: string | null;
  };

  return {
    ok: true,
    audit_id: result.audit_id,
    difference: result.difference,
    resolution: result.resolution,
    adjustment_tx_id: result.adjustment_tx_id,
  };
}

export async function searchProductsForAudit(
  query: string,
): Promise<
  Array<{
    id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    quantity: number;
    category: string | null;
    location: string | null;
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
    .select("id, name, variant, unit, quantity, category, location")
    .limit(200);

  return (data ?? []) as Array<{
    id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    quantity: number;
    category: string | null;
    location: string | null;
  }>;
}
