"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { deleteRequestTemplate } from "@/app/(mobile)/m/request/templates/actions";
import { TemplateEditDialog } from "@/components/requests/template-edit-dialog";
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

type TemplateRow = {
  id: string;
  name: string;
  note: string | null;
  is_public: boolean;
  created_by_name: string;
  can_delete: boolean;
  updated_at: string;
  items: Array<{
    product_id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    requested_quantity: number;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const nf = new Intl.NumberFormat("ko-KR");

export function TemplateTable({ rows }: { rows: TemplateRow[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<TemplateRow | null>(null);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
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
      <div className="rounded bg-card p-12 text-center text-sm text-muted-foreground">
        등록된 템플릿이 없습니다. 우측 상단 &quot;새 템플릿&quot; 버튼으로 만들 수 있습니다.
      </div>
    );
  }

  return (
    <>
      <div className="rounded bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_140px_120px_150px] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>이름 · 구성</span>
          <span className="text-center">공개</span>
          <span>작성자</span>
          <span>수정일</span>
          <span className="text-right">작업</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_80px_140px_120px_150px] gap-3 items-start px-5 py-4 border-t"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{r.name}</p>
              {r.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{r.note}</p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {r.items.slice(0, 8).map((it, idx) => (
                  <span
                    key={`${it.product_id}-${idx}`}
                    className="inline-flex items-center gap-1 rounded bg-surface-high px-1.5 py-0.5 text-[11px]"
                  >
                    <span className="text-foreground">{it.name}</span>
                    {it.variant && (
                      <span className="text-muted-foreground">· {it.variant}</span>
                    )}
                    <span className="text-muted-foreground tabular-nums">
                      × {nf.format(it.requested_quantity)}
                      {it.unit ?? ""}
                    </span>
                  </span>
                ))}
                {r.items.length > 8 && (
                  <span className="inline-flex items-center rounded bg-surface-high px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    +{r.items.length - 8}
                  </span>
                )}
              </div>
            </div>
            <span className="text-center">
              {r.is_public ? (
                <span className="inline-block rounded bg-secondary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-secondary">
                  공용
                </span>
              ) : (
                <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  개인
                </span>
              )}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {r.created_by_name}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {dateFormatter.format(new Date(r.updated_at))}
            </span>
            <div className="flex justify-end gap-1">
              {r.can_delete && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] text-foreground hover:bg-surface-low"
                  >
                    <Pencil className="h-3 w-3" /> 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleting(r);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1 rounded border border-destructive/30 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-3 w-3" /> 삭제
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <TemplateEditDialog
        template={editing}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
      />

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
              <span className="font-medium text-foreground">
                {deleting?.name}
              </span>{" "}
              템플릿을 삭제하시겠습니까? 이후에는 복구할 수 없습니다.
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
