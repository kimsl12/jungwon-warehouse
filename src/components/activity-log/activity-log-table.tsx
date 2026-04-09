import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ActivityLogRow = {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  details: unknown;
  user_id: string | null;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const ACTION_LABEL: Record<string, string> = {
  create: "생성",
  update: "수정",
  delete: "삭제",
  in: "입고",
  out: "출고",
};

const TABLE_LABEL: Record<string, string> = {
  products: "재고",
  transactions: "입출고",
};

function actionTone(action: string) {
  switch (action) {
    case "create":
    case "in":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "out":
    case "update":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "delete":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/**
 * Render a one-line summary of the activity_logs.details JSON.
 * Tries to be informative without dumping raw JSON when possible.
 */
function summarizeDetails(action: string, table: string, details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const d = details as Record<string, unknown>;

  // transactions: { product_id, quantity, note }
  if (table === "transactions") {
    const qty = typeof d.quantity === "number" ? d.quantity.toLocaleString("ko-KR") : "?";
    const note = typeof d.note === "string" && d.note.length > 0 ? ` — ${d.note}` : "";
    return `수량 ${qty}${note}`;
  }

  // products create/delete: full row → show name + quantity
  if (table === "products" && (action === "create" || action === "delete")) {
    const name = typeof d.name === "string" ? d.name : "?";
    const qty = typeof d.quantity === "number" ? d.quantity.toLocaleString("ko-KR") : "?";
    return `${name} (수량 ${qty})`;
  }

  // products update: { before, after } → diff fields
  if (table === "products" && action === "update") {
    const before = (d.before ?? {}) as Record<string, unknown>;
    const after = (d.after ?? {}) as Record<string, unknown>;
    const changes: string[] = [];
    const fields = ["name", "category", "unit", "min_quantity", "location"] as const;
    for (const f of fields) {
      if (before[f] !== after[f]) {
        const fromVal = before[f] ?? "∅";
        const toVal = after[f] ?? "∅";
        changes.push(`${f}: ${String(fromVal)} → ${String(toVal)}`);
      }
    }
    return changes.length > 0 ? changes.join(", ") : "변경 사항 없음";
  }

  return JSON.stringify(d).slice(0, 80);
}

export function ActivityLogTable({
  logs,
  profileNameMap,
}: {
  logs: ActivityLogRow[];
  profileNameMap: Map<string, string | null>;
}) {
  if (logs.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-12 text-center">
        <p className="text-sm text-muted-foreground">조건에 맞는 활동 로그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">일시</TableHead>
            <TableHead className="w-20">대상</TableHead>
            <TableHead className="w-16">동작</TableHead>
            <TableHead>내용</TableHead>
            <TableHead className="w-32">담당자</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const userName = log.user_id
              ? (profileNameMap.get(log.user_id) ?? "—")
              : "시스템";
            return (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {dateFormatter.format(new Date(log.created_at))}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {TABLE_LABEL[log.table_name] ?? log.table_name}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                      actionTone(log.action),
                    )}
                  >
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                </TableCell>
                <TableCell className="max-w-md truncate text-sm">
                  {summarizeDetails(log.action, log.table_name, log.details)}
                </TableCell>
                <TableCell className="text-muted-foreground">{userName}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
