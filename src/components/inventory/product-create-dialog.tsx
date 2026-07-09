"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createProduct, type ProductFormState } from "@/app/(dashboard)/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductFormFields } from "@/components/inventory/product-form-fields";

export function ProductCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ProductFormState>(null);
  const [isPending, startTransition] = useTransition();
  const [aliases, setAliases] = useState("");

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await createProduct(null, formData);
      if (result?.success) {
        toast.success("품목이 등록되었습니다.");
        setOpen(false);
        setState(null);
      } else {
        setState(result);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) { setState(null); setAliases(""); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>신규 품목</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>신규 품목 등록</DialogTitle>
          <DialogDescription>
            DB에 없던 자재를 처음 등록할 때 사용합니다. 같은 품목의 색상·규격 변형을
            추가할 때는 재고 목록에서 해당 품목의 &quot;처리 → 변형 추가&quot;를 이용하세요.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <ProductFormFields fieldErrors={state?.fieldErrors} disabled={isPending} />
          <div className="mt-4 border-t pt-4 space-y-1.5">
            <Label htmlFor="aliases">별칭 (검색용)</Label>
            <Input
              id="aliases"
              name="aliases"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="쉼표로 구분 (예: ST, 아연도)"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              별칭을 등록하면 재고 검색 시 별칭으로도 품목을 찾을 수 있습니다.
            </p>
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
              {isPending ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
