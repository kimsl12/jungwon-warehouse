import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type TransactionRow = {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  created_by: string | null;
  site_id: string | null;
  products: {
    id: string;
    name: string;
    category: string | null;
    unit: string | null;
  } | null;
  sites: {
    id: string;
    name: string;
  } | null;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function TransactionsTable({
  transactions,
  profileNameMap,
}: {
  transactions: TransactionRow[];
  profileNameMap: Map<string, string | null>;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-12 text-center">
        <p className="text-sm text-muted-foreground">조건에 맞는 입출고 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">일시</TableHead>
            <TableHead className="w-16">구분</TableHead>
            <TableHead>제품명</TableHead>
            <TableHead>분류</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead>현장</TableHead>
            <TableHead>담당자</TableHead>
            <TableHead>메모</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const userName = tx.created_by ? (profileNameMap.get(tx.created_by) ?? "—") : "—";
            return (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {dateFormatter.format(new Date(tx.created_at))}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                      tx.type === "in"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {tx.type === "in" ? "입고" : "출고"}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{tx.products?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {tx.products?.category ?? "-"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {tx.quantity.toLocaleString("ko-KR")}
                  {tx.products?.unit && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {tx.products.unit}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tx.sites?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{userName}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {tx.note ?? ""}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
