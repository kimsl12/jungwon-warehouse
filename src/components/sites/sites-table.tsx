"use client";

import { useState, useTransition } from "react";

import { deleteSite, toggleSiteActive } from "@/app/(dashboard)/sites/actions";
import { SiteEditDialog } from "@/components/sites/site-edit-dialog";
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
  contact: string | null;
  note: string | null;
  active: boolean;
  created_at: string;
};

export function SitesTable({ sites }: { sites: Site[] }) {
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

  return (
    <>
      <div className="rounded bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_120px_100px_80px_140px] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>현장명</span>
          <span>연락처</span>
          <span>메모</span>
          <span>상태</span>
          <span />
          <span className="text-right">작업</span>
        </div>
        {/* Rows */}
        {sites.map((site) => (
          <div
            key={site.id}
            className={`grid grid-cols-[1fr_1fr_120px_100px_80px_140px] gap-3 items-center px-5 py-3.5 hover:bg-surface-low/50 transition-colors ${site.active ? "" : "opacity-50"}`}
          >
            <div>
              <p className="text-sm font-medium">{site.name}</p>
              {site.address && <p className="text-xs text-muted-foreground">{site.address}</p>}
            </div>
            <span className="text-sm text-muted-foreground">{site.contact ?? "—"}</span>
            <span className="text-xs text-muted-foreground truncate">{site.note ?? "—"}</span>
            <span>
              {site.active ? (
                <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">활성</span>
              ) : (
                <span className="inline-block rounded bg-surface-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">비활성</span>
              )}
            </span>
            <span />
            <div className="flex justify-end gap-1">
              <button onClick={() => setEditing(site)} className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors">
                수정
              </button>
              <button onClick={() => handleToggle(site)} className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors">
                {site.active ? "비활성화" : "활성화"}
              </button>
              <button
                onClick={() => { setDeleting(site); setDeleteError(null); }}
                className="rounded bg-destructive/10 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/20 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <SiteEditDialog site={editing} open={true} onOpenChange={(open) => !open && setEditing(null)} />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open) { setDeleting(null); setDeleteError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>현장 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{deleting?.name}</span> 현장을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive" role="alert">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
