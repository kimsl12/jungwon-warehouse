"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteSite, toggleSiteActive } from "@/app/(dashboard)/sites/actions";
import {
  type AssigneeCandidate,
} from "@/components/sites/site-assignees-picker";
import { SiteEditDialog } from "@/components/sites/site-edit-dialog";
import { SiteStatementButton } from "@/components/sites/site-statement-button";
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

type Site = {
  id: string;
  name: string;
  address: string | null;
  note: string | null;
  active: boolean;
  created_at: string;
  assigneeIds: string[];
  assigneeNames: string[];
};

export function SitesTable({
  sites,
  assigneeCandidates,
}: {
  sites: Site[];
  assigneeCandidates: AssigneeCandidate[];
}) {
  const [editing, setEditing] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState<Site | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (sites.length === 0) {
    return (
      <div className="rounded bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">등록된 현장이 없습니다.</p>
      </div>
    );
  }

  function handleToggle(site: Site) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", site.id);
      fd.set("active", String(!site.active));
      await toggleSiteActive(fd);
    });
  }

  function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", deleting.id);
      const result = await deleteSite(fd);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleting(null);
    });
  }

  const GRID = "grid-cols-[1.3fr_1fr_1fr_90px_220px]";

  return (
    <>
      <div className="rounded bg-card overflow-hidden">
        {/* Header */}
        <div
          className={`grid ${GRID} gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`}
        >
          <span>현장명</span>
          <span>담당자</span>
          <span>메모</span>
          <span>상태</span>
          <span className="text-right">작업</span>
        </div>
        {/* Rows */}
        {sites.map((site) => (
          <div
            key={site.id}
            className={`grid ${GRID} gap-3 items-center px-5 py-3.5 hover:bg-surface-low/50 transition-colors border-t ${site.active ? "" : "opacity-50"}`}
          >
            <div className="min-w-0">
              <Link
                href={`/sites/${site.id}`}
                className="text-sm font-medium truncate hover:underline block"
              >
                {site.name}
              </Link>
              {site.address && (
                <p className="text-xs text-muted-foreground truncate">{site.address}</p>
              )}
            </div>
            <div className="min-w-0">
              {site.assigneeNames.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {site.assigneeNames.map((name) => (
                    <span
                      key={name}
                      className="inline-block rounded bg-surface-low px-1.5 py-0.5 text-[11px]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">{site.note ?? "—"}</span>
            <span>
              {site.active ? (
                <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                  활성
                </span>
              ) : (
                <span className="inline-block rounded bg-surface-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  비활성
                </span>
              )}
            </span>
            <div className="flex justify-end gap-1">
              <SiteStatementButton siteId={site.id} siteActive={site.active} />
              <button
                onClick={() => setEditing(site)}
                className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
              >
                수정
              </button>
              <button
                onClick={() => handleToggle(site)}
                className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
              >
                {site.active ? "비활성화" : "활성화"}
              </button>
              <button
                onClick={() => {
                  setDeleting(site);
                  setDeleteError(null);
                }}
                className="rounded bg-destructive/10 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/20 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <SiteEditDialog
          site={editing}
          assigneeCandidates={assigneeCandidates}
          open={true}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>현장 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{deleting?.name}</span> 현장을
              삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
