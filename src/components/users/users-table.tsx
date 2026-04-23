"use client";

import { useState, useTransition } from "react";

import { updateUserRole } from "@/app/(dashboard)/users/actions";
import { ProfileEditDialog } from "@/components/users/profile-edit-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  title: string | null;
  phone: string | null;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [confirmTarget, setConfirmTarget] = useState<{ user: UserRow; newRole: "admin" | "user" } | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(user: UserRow) {
    const newRole = user.role === "admin" ? "user" : "admin";
    setError(null);
    setConfirmTarget({ user, newRole });
  }

  function confirmChange() {
    if (!confirmTarget) return;
    startTransition(async () => {
      const result = await updateUserRole(confirmTarget.user.id, confirmTarget.newRole);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirmTarget(null);
      }
    });
  }

  if (users.length === 0) {
    return (
      <div className="rounded bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">등록된 사용자가 없습니다.</p>
      </div>
    );
  }

  const GRID = "grid-cols-[1fr_130px_120px_1fr_90px_110px_150px]";

  return (
    <>
      <div className="rounded bg-card overflow-hidden">
        <div className={`grid ${GRID} gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`}>
          <span>이름</span>
          <span>직급</span>
          <span>연락처</span>
          <span>이메일</span>
          <span>역할</span>
          <span>가입일</span>
          <span className="text-right">작업</span>
        </div>
        {users.map((user) => {
          const isMe = user.id === currentUserId;
          return (
            <div
              key={user.id}
              className={`grid ${GRID} gap-3 items-center px-5 py-3.5 hover:bg-surface-low/50 transition-colors border-t`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">
                  {(user.name ?? "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.name ?? "—"}</p>
                  {isMe && <span className="text-[10px] text-muted-foreground">나</span>}
                </div>
              </div>
              <span className="text-sm text-muted-foreground truncate">{user.title ?? "—"}</span>
              <span className="text-sm text-muted-foreground tabular-nums truncate">
                {user.phone ?? "—"}
              </span>
              <span className="text-sm text-muted-foreground truncate">{user.email ?? "—"}</span>
              <span>
                {user.role === "admin" ? (
                  <span className="inline-block rounded bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary">
                    관리자
                  </span>
                ) : (
                  <span className="inline-block rounded bg-surface-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    일반
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {dateFormatter.format(new Date(user.created_at))}
              </span>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setEditing(user)}
                  className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
                >
                  편집
                </button>
                <button
                  onClick={() => handleRoleChange(user)}
                  className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
                >
                  {user.role === "admin" ? "일반으로" : "관리자로"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <ProfileEditDialog
          user={editing}
          open={true}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}

      <AlertDialog open={confirmTarget !== null} onOpenChange={(open) => { if (!open) { setConfirmTarget(null); setError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>역할 변경</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{confirmTarget?.user.name ?? confirmTarget?.user.email}</span>님의 역할을{" "}
              <span className="font-semibold text-foreground">{confirmTarget?.newRole === "admin" ? "관리자" : "일반 사용자"}</span>로 변경하시겠습니까?
              {confirmTarget?.user.id === currentUserId && (
                <span className="mt-2 block text-destructive">본인의 권한을 변경합니다.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange} disabled={isPending}>
              {isPending ? "변경 중..." : "변경"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
