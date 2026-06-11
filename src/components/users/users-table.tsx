"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { History, Trash2 } from "lucide-react";

import { deleteUser, updateUserRole } from "@/app/(dashboard)/users/actions";
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
  assignedSiteIds: string[];
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
  const [confirmTarget, setConfirmTarget] = useState<{
    user: UserRow;
    newRole: "admin" | "user";
  } | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
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
      const result = await updateUserRole(
        confirmTarget.user.id,
        confirmTarget.newRole,
      );
      if (result.error) {
        setError(result.error);
      } else {
        setConfirmTarget(null);
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(deleting.id);
      if (result.error) {
        setError(result.error);
      } else {
        setDeleting(null);
      }
    });
  }

  if (users.length === 0) {
    return (
      <div className="rounded bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">
          등록된 사용자가 없습니다.
        </p>
      </div>
    );
  }

  const GRID =
    "min-w-[1000px] grid-cols-[1fr_130px_120px_1fr_90px_110px_280px]";

  return (
    <>
      <div className="rounded bg-card overflow-x-auto">
        <div
          className={`grid ${GRID} gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`}
        >
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
                  <p className="text-sm font-medium truncate">
                    {user.name ?? "—"}
                  </p>
                  {isMe && (
                    <span className="text-[10px] text-muted-foreground">
                      나
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm text-muted-foreground truncate">
                {user.title ?? "—"}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums truncate">
                {user.phone ?? "—"}
              </span>
              <span className="text-sm text-muted-foreground truncate">
                {user.email ?? "—"}
              </span>
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
                <Link
                  href={`/activity-log?table=profiles&record_id=${user.id}`}
                  title="이 사용자 역할 변경 이력"
                  className="inline-flex items-center gap-1 rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
                >
                  <History className="h-3 w-3" /> 이력
                </Link>
                <button
                  onClick={() => setEditing(user)}
                  className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
                >
                  {user.role === "user" && user.assignedSiteIds.length > 0
                    ? `편집·현장 ${user.assignedSiteIds.length}`
                    : "편집"}
                </button>
                <button
                  onClick={() => handleRoleChange(user)}
                  className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
                >
                  {user.role === "admin" ? "일반으로" : "관리자로"}
                </button>
                <button
                  onClick={() => setDeleting(user)}
                  disabled={user.id === currentUserId}
                  title={
                    user.id === currentUserId
                      ? "자기 자신은 삭제할 수 없습니다"
                      : "사용자 영구 삭제"
                  }
                  className="inline-flex items-center gap-1 rounded border border-destructive/30 px-2 py-1 text-[11px] text-destructive transition-colors hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="size-3" /> 삭제
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

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {deleting?.name ?? deleting?.email ?? "—"}
              </span>{" "}
              계정을 영구 삭제합니다. 로그인이 즉시 차단되며 본인이 만든 자재
              신청·입출고 기록은 보존되지만 작성자 표시는 빈칸으로 바뀝니다.
              복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "삭제 중..." : "영구 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTarget(null);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>역할 변경</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {confirmTarget?.user.name ?? confirmTarget?.user.email}
              </span>
              님의 역할을{" "}
              <span className="font-semibold text-foreground">
                {confirmTarget?.newRole === "admin" ? "관리자" : "일반 사용자"}
              </span>
              로 변경하시겠습니까?
              {confirmTarget?.user.id === currentUserId && (
                <span className="mt-2 block text-destructive">
                  본인의 권한을 변경합니다.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
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
