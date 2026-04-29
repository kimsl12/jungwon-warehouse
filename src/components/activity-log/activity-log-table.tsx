import {
  ACTION_LABEL,
  TABLE_LABEL,
  actionTone,
  formatLogDetails,
} from "@/lib/activity-log/format";
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
        <p className="text-sm text-muted-foreground">
          조건에 맞는 활동 로그가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[160px_90px_70px_1fr_100px] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span>일시</span>
        <span>대상</span>
        <span>동작</span>
        <span>내용</span>
        <span className="text-right">담당자</span>
      </div>
      {/* Rows */}
      {logs.map((log) => {
        const userName = log.user_id
          ? (profileNameMap.get(log.user_id) ?? "—")
          : "시스템";
        return (
          <div
            key={log.id}
            className="grid grid-cols-[160px_90px_70px_1fr_100px] gap-3 items-center px-5 py-3 hover:bg-surface-low/50 transition-colors border-t"
          >
            <span className="text-xs text-muted-foreground tabular-nums">
              {dateFormatter.format(new Date(log.created_at))}
            </span>
            <span className="text-xs text-muted-foreground">
              {TABLE_LABEL[log.table_name] ?? log.table_name}
            </span>
            <span>
              <span
                className={cn(
                  "inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  actionTone(log.action),
                )}
              >
                {ACTION_LABEL[log.action] ?? log.action}
              </span>
            </span>
            <span className="text-sm truncate">
              {formatLogDetails(log.table_name, log.action, log.details)}
            </span>
            <span className="text-right text-xs text-muted-foreground">
              {userName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
