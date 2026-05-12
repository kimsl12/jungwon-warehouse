"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import {
  CalendarGrid,
  type PurchaseOrderDue,
  type ScheduleWithAssignees,
  type SiteRange,
} from "./calendar-grid";
import { ScheduleDialog, type AssignableUser, type ScheduleEditValues } from "./schedule-dialog";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

export function CalendarView({
  year,
  month,
  sites,
  schedules,
  purchaseOrders,
  assignableUsers,
}: {
  year: number;
  month: number;
  sites: SiteRange[];
  schedules: ScheduleWithAssignees[];
  purchaseOrders: PurchaseOrderDue[];
  assignableUsers: AssignableUser[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ScheduleEditValues | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);

  function go(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    router.push(`/calendar?ym=${ym}`);
  }

  function goToday() {
    router.push("/calendar");
  }

  function handleCellAdd(dateStr: string) {
    setCreatingDate(dateStr);
    setEditing(null);
  }

  function handleScheduleClick(s: ScheduleWithAssignees) {
    setEditing({
      id: s.id,
      title: s.title,
      work_date: s.work_date,
      site_id: s.site_id,
      note: s.note,
      assignee_user_ids: s.assignees.map((a) => a.user_id),
    });
    setCreatingDate(null);
  }

  function closeDialog() {
    setEditing(null);
    setCreatingDate(null);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => go(-1)}>
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
            {year}년 {MONTH_NAMES[month - 1]}
          </h1>
          <Button variant="ghost" size="icon" onClick={() => go(1)}>
            <ChevronRight className="size-5" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2" onClick={goToday}>
            오늘
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => {
            const today = new Date();
            const kstMs = today.getTime() + 9 * 60 * 60 * 1000;
            setCreatingDate(new Date(kstMs).toISOString().slice(0, 10));
            setEditing(null);
          }}
        >
          <Plus className="size-4" /> 작업 일정
        </Button>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        sites={sites}
        schedules={schedules}
        purchaseOrders={purchaseOrders}
        onCellAdd={handleCellAdd}
        onScheduleClick={handleScheduleClick}
      />

      {(editing || creatingDate) && (
        <ScheduleDialog
          mode={editing ? "edit" : "create"}
          initial={editing ?? { work_date: creatingDate! }}
          assignableUsers={assignableUsers}
          sites={sites}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
