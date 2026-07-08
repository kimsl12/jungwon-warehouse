"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

import {
  deleteProduct,
  toggleProductActive,
} from "@/app/(dashboard)/inventory/actions";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProcessTransactionDialog } from "@/components/inventory/process-transaction-dialog";
import { ProductEditDialog } from "@/components/inventory/product-edit-dialog";
import { VariantAddDialog } from "@/components/inventory/variant-add-dialog";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type SiteOption = { id: string; name: string };

export function ProductRowActions({
  product,
  isAdmin,
  sites,
}: {
  product: Product;
  isAdmin: boolean;
  sites: SiteOption[];
}) {
  const [processOpen, setProcessOpen] = useState(false);
  const [processType, setProcessType] = useState<"in" | "out" | "loss">("in");
  const [variantOpen, setVariantOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openProcess(type: "in" | "out" | "loss") {
    setProcessType(type);
    setProcessOpen(true);
  }

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
      toast.success(`"${product.name}" 품목이 삭제되었습니다.`);
      setDeleteOpen(false);
    });
  }

  // is_active 는 gen:types 재생성 전까지 타입에 없음 — 런타임 값으로 판정
  const isActive =
    (product as unknown as { is_active?: boolean }).is_active !== false;

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleProductActive(product.id, !isActive);
      // 드롭다운이 이미 닫힌 뒤라 인라인 표시 불가 — 에러도 토스트로
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        isActive
          ? `"${product.name}" 품목을 단종 처리했습니다.`
          : `"${product.name}" 품목을 다시 활성화했습니다.`,
      );
    });
  }

  return (
    <div className="flex justify-end gap-1">
      {/* 처리: 입고 / 출고 / 변형 추가 를 드롭다운 메뉴로 통합 */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              처리 <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openProcess("in")}>
            입고 처리
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openProcess("out")}>
            출고 처리
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openProcess("loss")}>
            분실 처리
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setVariantOpen(true)}>
                변형 추가
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleToggleActive}
                disabled={isPending}
              >
                {isActive ? "단종 처리 (숨김)" : "단종 해제 (활성화)"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
        open={processOpen}
        onOpenChange={setProcessOpen}
        sites={sites}
        initialType={processType}
      />

      {isAdmin && (
        <>
          <VariantAddDialog
            baseProduct={product}
            open={variantOpen}
            onOpenChange={setVariantOpen}
          />

          <ProductEditDialog
            product={product}
            open={editOpen}
            onOpenChange={setEditOpen}
            isAdmin={isAdmin}
          />

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>품목 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">
                    {product.name}
                  </span>{" "}
                  품목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
