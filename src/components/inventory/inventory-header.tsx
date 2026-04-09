import Link from "next/link";

import { ProductCreateDialog } from "@/components/inventory/product-create-dialog";
import { buttonVariants } from "@/components/ui/button";

export function InventoryHeader({
  isAdmin,
  totalCount,
}: {
  isAdmin: boolean;
  totalCount: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">재고 관리</h2>
        <p className="text-sm text-muted-foreground">
          전체 {totalCount.toLocaleString("ko-KR")}개 품목
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/api/export/products"
          className={buttonVariants({ variant: "outline", size: "sm" })}
          prefetch={false}
        >
          CSV 내보내기
        </Link>
        {isAdmin && (
          <Link
            href="/inventory/import"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            CSV 가져오기
          </Link>
        )}
        {isAdmin && <ProductCreateDialog />}
      </div>
    </div>
  );
}
