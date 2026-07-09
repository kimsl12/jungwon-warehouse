"use client";

import { useState, useTransition } from "react";

import { createProduct, type ProductFormState } from "@/app/(dashboard)/inventory/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];

/**
 * 기준 품목(base product)이 이미 정해진 상태에서, 같은 품목명의 새 변형을
 * 추가하는 다이얼로그. 기준 품목의 분류·소분류·단위·위치는 그대로 상속
 * (잠금)되며, 사용자는 변형값·초기 수량만 입력하면 된다.
 *
 * 내부적으로는 createProduct Server Action을 호출해 INSERT 한다.
 * (name, variant) 조합 중복 검사는 서버 액션에서 수행.
 */
export function VariantAddDialog({
  baseProduct,
  open,
  onOpenChange,
}: {
  baseProduct: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<ProductFormState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    // 기준 품목의 속성들을 폼 데이터에 강제 주입 — UI는 잠겨 있지만
    // Server Action은 동일한 createProduct를 사용하므로 전체 필드가 필요함.
    formData.set("name", baseProduct.name);
    formData.set("category", baseProduct.category ?? "");
    formData.set("subcategory", baseProduct.subcategory ?? "");
    formData.set("unit", baseProduct.unit ?? "");
    formData.set("location", baseProduct.location ?? "");

    startTransition(async () => {
      const result = await createProduct(null, formData);
      if (result?.success) {
        onOpenChange(false);
        setState(null);
      } else {
        setState(result);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setState(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>변형 추가</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{baseProduct.name}</span>
            {" "}품목의 새 색상·규격을 추가합니다. 분류·단위·위치는 기준 품목에서
            자동 상속됩니다.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          {/* 기준 품목 정보 (읽기 전용 안내 박스) */}
          <div className="mb-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium">제품명:</span> {baseProduct.name}</p>
            <p>
              <span className="font-medium">분류:</span> {baseProduct.category ?? "—"}
              {baseProduct.subcategory && (
                <span className="ml-2">/ {baseProduct.subcategory}</span>
              )}
            </p>
            <p>
              <span className="font-medium">단위:</span> {baseProduct.unit ?? "—"}
              <span className="ml-4 font-medium">위치:</span> {baseProduct.location ?? "—"}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="variant-input">
                변형 (색상·규격) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="variant-input"
                name="variant"
                type="text"
                placeholder="예: 검정, 흰색, 20A"
                required
                autoFocus
                disabled={isPending}
                aria-invalid={state?.fieldErrors?.variant ? true : undefined}
              />
              {state?.fieldErrors?.variant?.[0] && (
                <p className="text-xs text-destructive">{state.fieldErrors.variant[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="variant-quantity">
                  초기 수량 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="variant-quantity"
                  name="quantity"
                  type="number"
                  min={0}
                  required
                  defaultValue={0}
                  disabled={isPending}
                  aria-invalid={state?.fieldErrors?.quantity ? true : undefined}
                />
                {state?.fieldErrors?.quantity?.[0] && (
                  <p className="text-xs text-destructive">{state.fieldErrors.quantity[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="variant-min-quantity">최소 재고</Label>
                <Input
                  id="variant-min-quantity"
                  name="min_quantity"
                  type="number"
                  min={0}
                  defaultValue={baseProduct.min_quantity}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="variant-aliases">별칭 (선택)</Label>
              <Input
                id="variant-aliases"
                name="aliases"
                type="text"
                placeholder="쉼표로 구분 (예: 블랙, BK)"
                disabled={isPending}
              />
              <p className="text-[11px] text-muted-foreground">
                별칭을 등록하면 재고 검색 시 별칭으로도 이 변형을 찾을 수 있습니다.
              </p>
            </div>
          </div>

          {state?.error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "등록 중..." : "변형 추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
