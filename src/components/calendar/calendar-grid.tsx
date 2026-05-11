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

function isInRange(target: string, start: string | null, end: string | null): boolean {
  if (start && target < start) return false;
  if (end && target > end) return false;
  // start/end 둘 다 null 이면 항상 진행 중으로 간주 X (표시 안 함)
  if (!start && !end) return false;
  return true;
}

export function CalendarGrid({
  year,
  month,
  sites,
  schedules,
  onCellAdd,
  onScheduleClick,
}: {
  year: number;
  month: number;
  sites: SiteRange[];
  schedules: ScheduleWithAssignees[];
  onCellAdd: (dateStr: string) => void;
  onScheduleClick: (s: ScheduleWithAssignees) => void;
}) {
  const gridDates = buildGridDates(year, month);
  const todayStr = (() => {
    const now = new Date();
    const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
    return new Date(kstMs).toISOString().slice(0, 10);
  })();

  // 일정 / 진행 중 현장을 날짜별로 그룹화
  const schedulesByDate = new Map<string, ScheduleWithAssignees[]>();
  for (const s of schedules) {
    const arr = schedulesByDate.get(s.work_date) ?? [];
    arr.push(s);
    schedulesByDate.set(s.work_date, arr);
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
          const activeSites = sites.filter((s) => isInRange(dateStr, s.start_date, s.end_date));
          const daySchedules = schedulesByDate.get(dateStr) ?? [];

          return (
            <CalendarDayCell
              key={i}
              date={d}
              dateStr={dateStr}
              inMonth={inMonth}
              isToday={isToday}
              weekday={weekday}
              sites={activeSites}
              schedules={daySchedules}
              onAdd={() => onCellAdd(dateStr)}
              onScheduleClick={onScheduleClick}
            />
          );
        })}
      </div>
    </div>
  );
}
