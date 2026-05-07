import "server-only";

import { lowStockLogTable } from "./db";
import { notifyLowStock } from "./notify";
import { getServiceClient } from "./send";

// KST 기준 오늘 날짜 (YYYY-MM-DD). Vercel 서버는 UTC 라 직접 보정.
function kstDateString(): string {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

/**
 * 재고 부족 알림 발송 시도 — 한 품목당 KST 일별 1회 디듀프.
 *
 * 흐름:
 * 1. products 조회로 현재 부족 상태인지 재확인 (race 회피).
 * 2. low_stock_notified_log 에 (product_id, today) 삽입 시도.
 *    UNIQUE 제약 충돌 = 오늘 이미 보냄 → skip.
 * 3. 삽입 성공 시 admin 전체에게 발송.
 *
 * 호출자는 try/catch 로 감싸 비즈니스 로직(출고 처리)을 막지 않도록.
 */
export async function tryNotifyLowStock(
  productId: string,
): Promise<{ sent: boolean; reason?: string }> {
  const svc = getServiceClient();

  const { data: prod } = await svc
    .from("products")
    .select("name, variant, unit, quantity, min_quantity")
    .eq("id", productId)
    .single();
  if (!prod) return { sent: false, reason: "product_not_found" };

  // RPC 가 low_stock=true 라도 직후 다른 입고가 들어왔을 수 있음. 재확인.
  if (prod.quantity > prod.min_quantity) {
    return { sent: false, reason: "recovered" };
  }

  const today = kstDateString();
  const { error: logErr } = await lowStockLogTable(svc).insert({
    product_id: productId,
    notified_date: today,
  });
  if (logErr) {
    // 23505 unique_violation = 오늘 이미 보냄
    return { sent: false, reason: "already_notified_today" };
  }

  await notifyLowStock({
    productId,
    productName: prod.name,
    variant: prod.variant,
    currentQuantity: prod.quantity,
    unit: prod.unit,
    minQuantity: prod.min_quantity,
  });
  return { sent: true };
}
