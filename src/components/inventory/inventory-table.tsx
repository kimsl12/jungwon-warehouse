import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LowStockBadge } from "@/components/inventory/low-stock-badge";
import { ProductRowActions } from "@/components/inventory/product-row-actions";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export type SiteOption = { id: string; name: string };

export function InventoryTable({
  products,
  isAdmin,
  sites,
}: {
  products: Product[];
  isAdmin: boolean;
  sites: SiteOption[];
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-12 text-center">
        <p className="text-sm text-muted-foreground">등록된 품목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제품명</TableHead>
            <TableHead>분류</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead className="text-right">최소수량</TableHead>
            <TableHead>위치</TableHead>
            <TableHead className="w-40 text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{product.name}</span>
                  <LowStockBadge
                    quantity={product.quantity}
                    minQuantity={product.min_quantity}
                  />
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{product.category ?? "-"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {product.quantity.toLocaleString("ko-KR")}
                {product.unit && (
                  <span className="ml-1 text-xs text-muted-foreground">{product.unit}</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {product.min_quantity.toLocaleString("ko-KR")}
              </TableCell>
              <TableCell className="text-muted-foreground">{product.location ?? "-"}</TableCell>
              <TableCell className="text-right">
                <ProductRowActions product={product} isAdmin={isAdmin} sites={sites} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
