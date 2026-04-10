import Link from "next/link";
import { Download, Upload } from "lucide-react";

import { ProductCreateDialog } from "@/components/inventory/product-create-dialog";

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
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          재고 관리
        </p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">품목 목록</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          전체 {totalCount.toLocaleString("ko-KR")}개 품목
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/api/export/products"
          className="flex items-center gap-1.5 rounded bg-surface-low px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-high transition-colors"
          prefetch={false}
        >
          <Download className="h-3.5 w-3.5" />
          내보내기
        </Link>
        {isAdmin && (
          <Link
            href="/inventory/import"
            className="flex items-center gap-1.5 rounded bg-surface-low px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-high transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            가져오기
          </Link>
        )}
        {isAdmin && <ProductCreateDialog />}
      </div>
    </div>
  );
}
