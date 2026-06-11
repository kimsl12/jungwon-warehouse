import { TransactionAdminDeleteButton } from "@/components/transactions/transaction-admin-delete-button";
import { TransactionUndoButton } from "@/components/transactions/transaction-undo-button";
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
  canceled_at: string | null;
  related_tx_id: string | null;
  products: {
    id: string;
    name: string;
    category: string | null;
    unit: string | null;
    variant: string | null;
  } | null;
  sites: {
    id: string;
    name: string;
  } | null;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const UNDO_WINDOW_MS = 20 * 60 * 1000;

export function TransactionsTable({
  transactions,
  profileNameMap,
  currentUserId,
  isAdmin,
}: {
  transactions: TransactionRow[];
  profileNameMap: Map<string, string | null>;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          조건에 맞는 입출고 내역이 없습니다.
        </p>
      </div>
    );
  }

  // undo 20분 윈도우 판정용 — 렌더 시점 기준 시간이 의도된 동작
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

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
            <TableHead className="w-20 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const userName = tx.created_by
              ? (profileNameMap.get(tx.created_by) ?? "—")
              : "—";
            const isCanceled = tx.canceled_at !== null;
            const isReversal = tx.related_tx_id !== null && !isCanceled;
            const isLinked =
              tx.note?.startsWith("자재 신청 출고") === true ||
              tx.note?.startsWith("발주 ") === true;
            const age = now - new Date(tx.created_at).getTime();
            const canAdminDelete =
              isAdmin && !isCanceled && !isReversal && !isLinked;
            const canUndo =
              !canAdminDelete &&
              !isCanceled &&
              !isReversal &&
              !isLinked &&
              currentUserId !== null &&
              tx.created_by === currentUserId &&
              age < UNDO_WINDOW_MS;

            return (
              <TableRow
                key={tx.id}
                className={
                  isCanceled
                    ? "opacity-50 line-through decoration-muted-foreground"
                    : undefined
                }
              >
                <TableCell className="text-muted-foreground tabular-nums">
                  {dateFormatter.format(new Date(tx.created_at))}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                      tx.type === "in"
                        ? "bg-success-bg text-success dark:bg-emerald-950 dark:text-emerald-300"
                        : tx.type === "loss"
                          ? "bg-danger-bg text-danger dark:bg-red-950 dark:text-red-300"
                          : "bg-warning-bg text-warning dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {tx.type === "in"
                      ? "입고"
                      : tx.type === "loss"
                        ? "분실"
                        : "출고"}
                  </span>
                  {isCanceled && (
                    <span className="ml-1.5 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground no-underline">
                      취소됨
                    </span>
                  )}
                  {isReversal && (
                    <span className="ml-1.5 inline-flex items-center rounded bg-info-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-info">
                      역방향
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {tx.products?.name ?? "-"}
                  {tx.products?.variant && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      · {tx.products.variant}
                    </span>
                  )}
                </TableCell>
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
                <TableCell className="text-muted-foreground">
                  {userName}
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {tx.note ?? ""}
                </TableCell>
                <TableCell className="text-right">
                  {canAdminDelete && (
                    <TransactionAdminDeleteButton txId={tx.id} />
                  )}
                  {canUndo && <TransactionUndoButton txId={tx.id} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
