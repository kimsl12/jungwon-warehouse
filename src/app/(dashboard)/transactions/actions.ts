"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// undoTransaction — 본인이 20분 이내에 작성한 입출고 트랜잭션을 취소.
//   - 원본에 canceled_at 마킹
//   - 반대 방향 트랜잭션을 신규 insert 해 재고·이력 복구
//   - 자재 신청 출고 / 발주 입고는 DB 레벨에서 차단 (RPC 내)
// -----------------------------------------------------------------------------
const undoSchema = z.object({
  tx_id: z.string().uuid(),
  reason: z.string().trim().max(200).nullable().optional(),
});

export async function undoTransaction(
  txId: string,
  reason: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = undoSchema.safeParse({ tx_id: txId, reason });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const { error } = await supabase.rpc("undo_transaction", {
    p_tx_id: parsed.data.tx_id,
    p_reason: (parsed.data.reason ?? null) as unknown as string,
  });

  if (error) {
    if (error.message.includes("TX_NOT_FOUND")) return { error: "해당 트랜잭션을 찾을 수 없습니다." };
    if (error.message.includes("ALREADY_CANCELED")) return { error: "이미 취소된 건입니다." };
    if (error.message.includes("UNDO_WINDOW_EXPIRED"))
      return { error: "취소 가능 시간(20분)이 지났습니다." };
    if (error.message.includes("NOT_OWNER"))
      return { error: "본인이 작성한 건만 취소할 수 있습니다." };
    if (error.message.includes("LINKED_TX"))
      return {
        error: "자재 신청 또는 발주서와 연결된 건은 취소할 수 없습니다. 해당 화면에서 처리하세요.",
      };
    if (error.message.includes("INSUFFICIENT_STOCK_FOR_UNDO"))
      return {
        error: "취소 시 재고가 음수가 됩니다. 이미 일부가 출고된 상태이니 수동 보정이 필요합니다.",
      };
    return { error: "취소 실패: " + error.message };
  }

  revalidatePath("/transactions");
  revalidatePath("/inventory");
  revalidatePath("/overview");
  return { error: null };
}
