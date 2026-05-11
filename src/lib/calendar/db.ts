import type { SupabaseClient } from "@supabase/supabase-js";

// work_schedules / work_schedule_assignees 는 마이그레이션 20260511000000 이후
// `pnpm gen:types` 재실행해야 database.types.ts 에 추가됩니다. 그 전까지 단언 우회.
// 타입 재생성 후 이 헬퍼는 제거 가능.

export type WorkScheduleRow = {
  id: string;
  site_id: string | null;
  title: string;
  work_date: string; // YYYY-MM-DD
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkScheduleAssigneeRow = {
  id: string;
  work_schedule_id: string;
  user_id: string;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

export function workSchedulesTable(supabase: AnyClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from("work_schedules") as ReturnType<
    AnyClient["from"]
  >;
}

export function workScheduleAssigneesTable(supabase: AnyClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from("work_schedule_assignees") as ReturnType<
    AnyClient["from"]
  >;
}

// =============================================================================
// KST 날짜 헬퍼
// =============================================================================

/** 현재 KST 기준 YYYY-MM-DD */
export function kstTodayString(): string {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

/** KST 기준 (year, month) — month 는 1~12 */
export function kstYearMonth(): { year: number; month: number } {
  const today = kstTodayString();
  const [y, m] = today.split("-");
  return { year: Number(y), month: Number(m) };
}
