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
        <h2 className="text-2xl font-bold tracking-tight">재고 관리</h2>
        <p className="text-sm text-muted-foreground">
          전체 {totalCount.toLocaleString("ko-KR")}개 품목
        </p>
      </div>
      {isAdmin && <ProductCreateDialog />}
    </div>
  );
}
