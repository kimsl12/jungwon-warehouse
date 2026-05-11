"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  workSchedulesTable,
  workScheduleAssigneesTable,
} from "@/lib/calendar/db";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.");

const createSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(120),
  work_date: dateStr,
  site_id: uuid.nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  assignee_user_ids: z.array(uuid).default([]),
});

const updateSchema = createSchema.extend({
  id: uuid,
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "로그인이 필요합니다.", supabase };
  }
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

export type CreateWorkScheduleInput = z.input<typeof createSchema>;
export type UpdateWorkScheduleInput = z.input<typeof updateSchema>;

export async function createWorkSchedule(
  input: CreateWorkScheduleInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { data, error } = await workSchedulesTable(auth.supabase)
    .insert({
      title: parsed.data.title,
      work_date: parsed.data.work_date,
      site_id: parsed.data.site_id ?? null,
      note: parsed.data.note ?? null,
      created_by: auth.user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: "일정 생성 실패: " + error.message };
  const scheduleId = (data as { id: string }).id;

  if (parsed.data.assignee_user_ids.length > 0) {
    const rows = parsed.data.assignee_user_ids.map((uid) => ({
      work_schedule_id: scheduleId,
      user_id: uid,
    }));
    const { error: assignErr } = await workScheduleAssigneesTable(auth.supabase).insert(rows);
    if (assignErr) {
      // 일정은 만들어졌으니 fail-soft. UI 에서 재시도하도록 메시지 명시.
      return { ok: false, error: "일정은 생성됐으나 작업자 배정 실패: " + assignErr.message };
    }
  }

  revalidatePath("/calendar");
  return { ok: true, id: scheduleId };
}

export async function updateWorkSchedule(
  input: UpdateWorkScheduleInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { error } = await workSchedulesTable(auth.supabase)
    .update({
      title: parsed.data.title,
      work_date: parsed.data.work_date,
      site_id: parsed.data.site_id ?? null,
      note: parsed.data.note ?? null,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "일정 수정 실패: " + error.message };

  // assignees: 전체 삭제 후 재삽입 (단순). N+1 배정자 수정 시 충분히 빠름.
  const { error: delErr } = await workScheduleAssigneesTable(auth.supabase)
    .delete()
    .eq("work_schedule_id", parsed.data.id);
  if (delErr) return { ok: false, error: "배정자 초기화 실패: " + delErr.message };

  if (parsed.data.assignee_user_ids.length > 0) {
    const rows = parsed.data.assignee_user_ids.map((uid) => ({
      work_schedule_id: parsed.data.id,
      user_id: uid,
    }));
    const { error: insErr } = await workScheduleAssigneesTable(auth.supabase).insert(rows);
    if (insErr) return { ok: false, error: "배정자 추가 실패: " + insErr.message };
  }

  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteWorkSchedule(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!uuid.safeParse(id).success) return { ok: false, error: "잘못된 ID 입니다." };

  // assignees 는 ON DELETE CASCADE 로 자동 삭제
  const { error } = await workSchedulesTable(auth.supabase).delete().eq("id", id);
  if (error) return { ok: false, error: "삭제 실패: " + error.message };

  revalidatePath("/calendar");
  return { ok: true };
}
