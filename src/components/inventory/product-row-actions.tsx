"use client";

import { useState, useTransition } from "react";

import { deleteProduct } from "@/app/(dashboard)/inventory/actions";
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
import { ProcessTransactionDialog } from "@/components/inventory/process-transaction-dialog";
import { ProductEditDialog } from "@/components/inventory/product-edit-dialog";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function ProductRowActions({
  product,
  isAdmin,
}: {
  product: Product;
  isAdmin: boolean;
}) {
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", product.id);
      const result = await deleteProduct(fd);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteOpen(false);
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="outline" size="sm" onClick={() => setTransactionOpen(true)}>
        처리
      </Button>
      {isAdmin && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            삭제
          </Button>
        </>
      )}

      <ProcessTransactionDialog
        product={product}
        open={transactionOpen}
        onOpenChange={setTransactionOpen}
      />

      {isAdmin && (
        <>
          <ProductEditDialog product={product} open={editOpen} onOpenChange={setEditOpen} />

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>품목 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">{product.name}</span> 품목을
                  삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p className="text-sm text-destructive" role="alert">
                  {deleteError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "삭제 중..." : "삭제"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
