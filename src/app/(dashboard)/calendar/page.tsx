import { redirect } from "next/navigation";

import { CalendarView } from "@/components/calendar/calendar-view";
import {
  kstYearMonth,
  workScheduleAssigneesTable,
  workSchedulesTable,
  type WorkScheduleAssigneeRow,
  type WorkScheduleRow,
} from "@/lib/calendar/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ym?: string }>;

function parseYearMonth(ym: string | undefined): { year: number; month: number } {
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    const [y, m] = ym.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m };
  }
  return kstYearMonth();
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/overview");

  const { ym } = await searchParams;
  const { year, month } = parseYearMonth(ym);

  // 해당 월의 첫날 ~ 마지막날 (KST 기준 — 문자열 비교만 하면 OK)
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  // 다음 달 1일 - 1ms 가 아닌, 단순히 마지막 일 구함
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // 작업 일정 (그 달)
  const { data: schedulesRaw } = await workSchedulesTable(supabase)
    .select("id, site_id, title, work_date, note")
    .gte("work_date", monthStart)
    .lte("work_date", monthEnd)
    .order("work_date", { ascending: true });
  const schedules = (schedulesRaw ?? []) as Array<
    Pick<WorkScheduleRow, "id" | "site_id" | "title" | "work_date" | "note">
  >;

  // 그 일정들의 작업자
  const scheduleIds = schedules.map((s) => s.id);
  let assigneesRaw: WorkScheduleAssigneeRow[] = [];
  if (scheduleIds.length > 0) {
    const { data } = await workScheduleAssigneesTable(supabase)
      .select("id, work_schedule_id, user_id, created_at")
      .in("work_schedule_id", scheduleIds);
    assigneesRaw = (data ?? []) as WorkScheduleAssigneeRow[];
  }

  // 그 달 발주서 납기 (canceled 제외)
  const { data: posRaw } = await supabase
    .from("purchase_orders")
    .select("id, po_number, due_date, status, vendor_id, vendors!purchase_orders_vendor_id_fkey(name)")
    .gte("due_date", monthStart)
    .lte("due_date", monthEnd)
    .neq("status", "canceled")
    .order("due_date", { ascending: true });
  const purchaseOrders = (posRaw ?? []).map((p) => {
    const v = p.vendors as { name?: string } | null;
    return {
      id: p.id as string,
      po_number: p.po_number as string,
      due_date: p.due_date as string,
      status: p.status as string,
      vendor_name: v?.name ?? null,
    };
  });

  // 사이트 — active 만 가져와서 그 달과 겹치는지 client 가 판단
  const { data: sitesRaw } = await supabase
    .from("sites")
    .select("id, name, start_date, end_date")
    .eq("active", true)
    .order("name");
  const sites = (sitesRaw ?? []) as Array<{
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
  }>;

  // 사용자 목록 (배정용)
  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, name, role")
    .order("name");
  const profiles = (profilesRaw ?? []) as Array<{
    id: string;
    name: string | null;
    role: string;
  }>;

  // 작업자 이름 매핑 (assignee 표시용)
  const userNameMap = new Map(profiles.map((p) => [p.id, p.name ?? "(이름 없음)"]));
  const schedulesWithAssignees = schedules.map((s) => ({
    ...s,
    assignees: assigneesRaw
      .filter((a) => a.work_schedule_id === s.id)
      .map((a) => ({ user_id: a.user_id, name: userNameMap.get(a.user_id) ?? "?" })),
  }));

  return (
    <CalendarView
      year={year}
      month={month}
      sites={sites}
      schedules={schedulesWithAssignees}
      purchaseOrders={purchaseOrders}
      assignableUsers={profiles.map((p) => ({
        id: p.id,
        name: p.name ?? "(이름 없음)",
        role: p.role,
      }))}
    />
  );
}
