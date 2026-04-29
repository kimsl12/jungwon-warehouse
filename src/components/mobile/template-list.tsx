"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteRequestTemplate } from "@/app/(mobile)/m/request/templates/actions";
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

type Row = {
  id: string;
  name: string;
  note: string | null;
  itemCount: number;
  is_public: boolean;
  can_delete: boolean;
  updated_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function TemplateList({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRequestTemplate(deleting.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeleting(null);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">등록된 템플릿이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-md border bg-background p-3 flex items-start justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{r.name}</p>
                {r.is_public && (
                  <span className="shrink-0 inline-block rounded bg-secondary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-secondary">
                    공용
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                자재 {r.itemCount}개 · {dateFormatter.format(new Date(r.updated_at))}
              </p>
              {r.note && (
                <p className="mt-1 text-xs text-muted-foreground truncate">{r.note}</p>
              )}
            </div>
            {r.can_delete && (
              <button
                type="button"
                onClick={() => {
                  setDeleting(r);
                  setError(null);
                }}
                className="shrink-0 inline-flex items-center gap-1 rounded border border-destructive/30 px-2 py-1 text-[11px] text-destructive active:bg-destructive/5"
                aria-label="삭제"
              >
                <Trash2 className="h-3 w-3" /> 삭제
              </button>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>템플릿 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{deleting?.name}</span> 템플릿을
              삭제하시겠습니까? 이후에는 복구할 수 없습니다.
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
              {isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
