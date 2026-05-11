"use client";

import { Plus, Users } from "lucide-react";

import type { ScheduleWithAssignees, SiteRange } from "./calendar-grid";
import { cn } from "@/lib/utils";

export function CalendarDayCell({
  date,
  dateStr,
  inMonth,
  isToday,
  weekday,
  sites,
  schedules,
  onAdd,
  onScheduleClick,
}: {
  date: Date;
  dateStr: string;
  inMonth: boolean;
  isToday: boolean;
  weekday: number;
  sites: SiteRange[];
  schedules: ScheduleWithAssignees[];
  onAdd: () => void;
  onScheduleClick: (s: ScheduleWithAssignees) => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex min-h-[110px] flex-col gap-1 border-r border-b p-1.5 md:min-h-[130px]",
        !inMonth && "bg-muted/30 text-muted-foreground/60",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-[12px] font-medium",
            isToday && "bg-primary text-primary-foreground font-semibold",
            !isToday && weekday === 0 && inMonth && "text-red-500",
            !isToday && weekday === 6 && inMonth && "text-blue-500",
          )}
        >
          {date.getDate()}
        </span>
        {inMonth && (
          <button
            type="button"
            onClick={onAdd}
            className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
            aria-label="일정 추가"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      {/* 진행 중 현장 — 최대 2개 */}
      {sites.slice(0, 2).map((s) => (
        <div
          key={s.id}
          className="truncate rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
          title={s.name}
        >
          {s.name}
        </div>
      ))}
      {sites.length > 2 && (
        <div className="text-[10px] text-muted-foreground">+ {sites.length - 2} 현장</div>
      )}

      {/* 작업 일정 — 최대 3개 */}
      {schedules.slice(0, 3).map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onScheduleClick(s)}
          className="flex items-center gap-1 truncate rounded bg-sky-100 px-1.5 py-0.5 text-left text-[11px] font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-900/60"
          title={s.title}
        >
          <span className="flex-1 truncate">{s.title}</span>
          {s.assignees.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-sky-700 dark:text-sky-300">
              <Users className="size-3" />
              {s.assignees.length}
            </span>
          )}
        </button>
      ))}
      {schedules.length > 3 && (
        <div className="text-[10px] text-muted-foreground">+ {schedules.length - 3} 일정</div>
      )}
    </div>
  );
}
