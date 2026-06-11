"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  deleteVendor,
  toggleVendorActive,
} from "@/app/(dashboard)/vendors/actions";
import { VendorEditDialog } from "@/components/vendors/vendor-edit-dialog";
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

type Vendor = {
  id: string;
  name: string;
  ceo: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  fax: string | null;
  email: string | null;
  address: string | null;
  business_number: string | null;
  note: string | null;
  active: boolean;
  created_at: string;
};

export function VendorsTable({ vendors }: { vendors: Vendor[] }) {
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState<Vendor | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (vendors.length === 0) {
    return (
      <div className="rounded bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">
          등록된 거래처가 없습니다.
        </p>
      </div>
    );
  }

  function handleToggle(vendor: Vendor) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", vendor.id);
      fd.set("active", String(!vendor.active));
      await toggleVendorActive(fd);
    });
  }

  function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", deleting.id);
      const result = await deleteVendor(fd);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleting(null);
    });
  }

  return (
    <>
      <div className="rounded bg-card overflow-x-auto">
        <div className="grid min-w-[820px] grid-cols-[1fr_130px_130px_130px_80px_200px] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>거래처명</span>
          <span>담당자</span>
          <span>연락처</span>
          <span>팩스</span>
          <span>상태</span>
          <span className="text-right">작업</span>
        </div>
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className={`grid min-w-[820px] grid-cols-[1fr_130px_130px_130px_80px_200px] gap-3 items-center px-5 py-3.5 hover:bg-surface-low/50 transition-colors ${vendor.active ? "" : "opacity-50"}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{vendor.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {vendor.ceo ?? "대표자 미입력"}
                {vendor.business_number && (
                  <span className="ml-2">· {vendor.business_number}</span>
                )}
              </p>
            </div>
            <span className="text-sm text-muted-foreground truncate">
              {vendor.contact_person ?? "—"}
            </span>
            <span className="text-sm text-muted-foreground truncate tabular-nums">
              {vendor.contact_phone ?? "—"}
            </span>
            <span className="text-sm text-muted-foreground truncate tabular-nums">
              {vendor.fax ?? "—"}
            </span>
            <span>
              {vendor.active ? (
                <span className="inline-block rounded bg-success-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                  활성
                </span>
              ) : (
                <span className="inline-block rounded bg-surface-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  비활성
                </span>
              )}
            </span>
            <div className="flex justify-end gap-1">
              <Link
                href={`/vendors/${vendor.id}`}
                className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
              >
                단가
              </Link>
              <button
                onClick={() => setEditing(vendor)}
                className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
              >
                수정
              </button>
              <button
                onClick={() => handleToggle(vendor)}
                className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
              >
                {vendor.active ? "비활성" : "활성화"}
              </button>
              <button
                onClick={() => {
                  setDeleting(vendor);
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
        <VendorEditDialog
          vendor={editing}
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
            <AlertDialogTitle>거래처 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {deleting?.name}
              </span>{" "}
              거래처를 삭제하시겠습니까?
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
