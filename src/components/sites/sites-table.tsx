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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="rounded-md border bg-muted/20 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          등록된 현장이 없습니다. 우측 상단의 &quot;현장 등록&quot; 버튼을 눌러 시작하세요.
        </p>
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>현장명</TableHead>
              <TableHead>주소</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>메모</TableHead>
              <TableHead className="w-20">상태</TableHead>
              <TableHead className="w-48 text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id} className={site.active ? "" : "opacity-60"}>
                <TableCell className="font-medium">{site.name}</TableCell>
                <TableCell className="text-muted-foreground">{site.address ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{site.contact ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {site.note ?? "—"}
                </TableCell>
                <TableCell>
                  {site.active ? (
                    <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      활성
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      비활성
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(site)}>
                      수정
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(site)}>
                      {site.active ? "비활성화" : "활성화"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setDeleting(site);
                        setDeleteError(null);
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <SiteEditDialog
          site={editing}
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
              삭제하시겠습니까? 출고 내역이 있으면 삭제할 수 없으니 비활성화를 사용하세요.
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
