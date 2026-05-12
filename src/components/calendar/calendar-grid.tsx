"use client";

import { CalendarDayCell } from "./calendar-day-cell";
import { cn } from "@/lib/utils";

export type SiteRange = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export type ScheduleWithAssignees = {
  id: string;
  site_id: string | null;
  title: string;
  work_date: string;
  note: string | null;
  assignees: Array<{ user_id: string; name: string }>;
};

export type PurchaseOrderDue = {
  id: string;
  po_number: string;
  due_date: string;
  status: string;
  vendor_name: string | null;
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * year/month 의 그리드용 날짜 배열. 첫 주 앞부분 + 마지막 주 뒷부분에 인접 월 날짜 포함.
 * 항상 6주(42칸).
 */
function buildGridDates(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay(); // 0(일) ~ 6(토)
  const gridStart = new Date(year, month - 1, 1 - startWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarGrid({
  year,
  month,
  schedules,
  purchaseOrders,
  onCellAdd,
  onScheduleClick,
}: {
  year: number;
  month: number;
  schedules: ScheduleWithAssignees[];
  purchaseOrders: PurchaseOrderDue[];
  onCellAdd: (dateStr: string) => void;
  onScheduleClick: (s: ScheduleWithAssignees) => void;
}) {
  const gridDates = buildGridDates(year, month);
  const todayStr = (() => {
    const now = new Date();
    const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
    return new Date(kstMs).toISOString().slice(0, 10);
  })();

  // 일정 / 진행 중 현장 / 발주 납기를 날짜별로 그룹화
  const schedulesByDate = new Map<string, ScheduleWithAssignees[]>();
  for (const s of schedules) {
    const arr = schedulesByDate.get(s.work_date) ?? [];
    arr.push(s);
    schedulesByDate.set(s.work_date, arr);
  }
  const posByDate = new Map<string, PurchaseOrderDue[]>();
  for (const p of purchaseOrders) {
    const arr = posByDate.get(p.due_date) ?? [];
    arr.push(p);
    posByDate.set(p.due_date, arr);
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "px-2 py-2 text-center text-[12px] font-semibold text-muted-foreground",
              i === 0 && "text-red-500",
              i === 6 && "text-blue-500",
            )}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {gridDates.map((d, i) => {
          const dateStr = dateToString(d);
          const inMonth = d.getMonth() === month - 1;
          const isToday = dateStr === todayStr;
          const weekday = d.getDay();
          const daySchedules = schedulesByDate.get(dateStr) ?? [];
          const dayPOs = posByDate.get(dateStr) ?? [];

          return (
            <CalendarDayCell
              key={i}
              date={d}
              dateStr={dateStr}
              inMonth={inMonth}
              isToday={isToday}
              weekday={weekday}
              schedules={daySchedules}
              purchaseOrders={dayPOs}
              onAdd={() => onCellAdd(dateStr)}
              onScheduleClick={onScheduleClick}
            />
          );
        })}
      </div>
    </div>
  );
}
