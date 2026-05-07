import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase 자동 생성 타입(database.types.ts) 은 마이그레이션 20260507000000 이후
// `pnpm supabase gen types typescript` 를 다시 실행해야 push_subscriptions /
// low_stock_notified_log 테이블이 추가됩니다. 그 전까지 단언으로 우회.
// 타입 재생성 후 이 헬퍼들은 제거하고 supabase.from(...) 로 직접 호출 가능.
//
// CLAUDE.md 가 database.types.ts 수동 편집 금지를 명시하므로 우회는 여기서만.

export type PushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  enabled: boolean;
};

export type LowStockNotifiedLogRow = {
  product_id: string;
  notified_date: string; // YYYY-MM-DD (KST)
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

export function pushSubsTable(supabase: AnyClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from("push_subscriptions") as ReturnType<
    AnyClient["from"]
  >;
}

export function lowStockLogTable(supabase: AnyClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from("low_stock_notified_log") as ReturnType<
    AnyClient["from"]
  >;
}
