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
  timeZone: "Asia/Seoul",
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
      return "bg-emerald-100 text-emerald-700";
    case "out":
    case "update":
      return "bg-secondary-container/30 text-secondary";
    case "delete":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-surface-high text-muted-foreground";
  }
}

function summarizeDetails(action: string, table: string, details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const d = details as Record<string, unknown>;

  if (table === "transactions") {
    const qty = typeof d.quantity === "number" ? d.quantity.toLocaleString("ko-KR") : "?";
    const note = typeof d.note === "string" && d.note.length > 0 ? ` — ${d.note}` : "";
    return `수량 ${qty}${note}`;
  }

  if (table === "products" && (action === "create" || action === "delete")) {
    const name = typeof d.name === "string" ? d.name : "?";
    const qty = typeof d.quantity === "number" ? d.quantity.toLocaleString("ko-KR") : "?";
    return `${name} (수량 ${qty})`;
  }

  if (table === "products" && action === "update") {
    const before = (d.before ?? {}) as Record<string, unknown>;
    const after = (d.after ?? {}) as Record<string, unknown>;
    const changes: string[] = [];
    const fields = ["name", "category", "unit", "min_quantity", "location"] as const;
    for (const f of fields) {
      if (before[f] !== after[f]) {
        changes.push(`${f}: ${String(before[f] ?? "∅")} → ${String(after[f] ?? "∅")}`);
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
      <div className="rounded bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">조건에 맞는 활동 로그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[160px_80px_70px_1fr_100px] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span>일시</span>
        <span>대상</span>
        <span>동작</span>
        <span>내용</span>
        <span className="text-right">담당자</span>
      </div>
      {/* Rows */}
      {logs.map((log) => {
        const userName = log.user_id ? (profileNameMap.get(log.user_id) ?? "—") : "시스템";
        return (
          <div key={log.id} className="grid grid-cols-[160px_80px_70px_1fr_100px] gap-3 items-center px-5 py-3 hover:bg-surface-low/50 transition-colors">
            <span className="text-xs text-muted-foreground tabular-nums">
              {dateFormatter.format(new Date(log.created_at))}
            </span>
            <span className="text-xs text-muted-foreground">
              {TABLE_LABEL[log.table_name] ?? log.table_name}
            </span>
            <span>
              <span className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", actionTone(log.action))}>
                {ACTION_LABEL[log.action] ?? log.action}
              </span>
            </span>
            <span className="text-sm truncate">{summarizeDetails(log.action, log.table_name, log.details)}</span>
            <span className="text-right text-xs text-muted-foreground">{userName}</span>
          </div>
        );
      })}
    </div>
  );
}
