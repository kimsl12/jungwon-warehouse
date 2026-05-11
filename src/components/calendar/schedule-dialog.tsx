"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  createWorkSchedule,
  deleteWorkSchedule,
  updateWorkSchedule,
} from "@/app/(dashboard)/calendar/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SiteRange } from "./calendar-grid";

export type AssignableUser = {
  id: string;
  name: string;
  role: string;
};

export type ScheduleEditValues = {
  id?: string;
  title?: string;
  work_date: string;
  site_id?: string | null;
  note?: string | null;
  assignee_user_ids?: string[];
};

export function ScheduleDialog({
  mode,
  initial,
  assignableUsers,
  sites,
  onClose,
}: {
  mode: "create" | "edit";
  initial: ScheduleEditValues;
  assignableUsers: AssignableUser[];
  sites: SiteRange[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title ?? "");
  const [workDate, setWorkDate] = useState(initial.work_date);
  const [siteId, setSiteId] = useState<string>(initial.site_id ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [assignees, setAssignees] = useState<Set<string>>(
    new Set(initial.assignee_user_ids ?? []),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleAssignee(userId: string) {
    setAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const payload = {
        title: title.trim(),
        work_date: workDate,
        site_id: siteId || null,
        note: note.trim() || null,
        assignee_user_ids: Array.from(assignees),
      };
      const result =
        mode === "edit" && initial.id
          ? await updateWorkSchedule({ id: initial.id, ...payload })
          : await createWorkSchedule(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function handleDelete() {
    if (!initial.id) return;
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const result = await deleteWorkSchedule(initial.id!);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "작업 일정 수정" : "작업 일정 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="예: 무역센터 명품관 매립등 교체"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">날짜 *</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">현장 (선택)</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— 현장 미정 —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
              작업자 배정 ({assignees.size}명)
            </label>
            <div className="max-h-40 overflow-auto rounded-md border bg-background p-2">
              {assignableUsers.length === 0 && (
                <div className="text-[12px] text-muted-foreground">등록된 사용자가 없습니다.</div>
              )}
              {assignableUsers.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 py-1 text-sm hover:bg-accent/50"
                >
                  <input
                    type="checkbox"
                    checked={assignees.has(u.id)}
                    onChange={() => toggleAssignee(u.id)}
                    className="size-4"
                  />
                  <span className="flex-1">{u.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {u.role === "admin" ? "관리자" : "사용자"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">메모 (선택)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div>}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {mode === "edit" && (
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={pending}>
                <Trash2 className="size-4" /> 삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>
              취소
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending && <Loader2 className="size-3 animate-spin" />}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
