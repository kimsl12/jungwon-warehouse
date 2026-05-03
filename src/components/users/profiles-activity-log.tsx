import {
  ACTION_LABEL,
  formatLogDetails,
} from "@/lib/activity-log/format";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";

const ACTION_TONE: Record<string, StatusTone> = {
  create: "success",
  update: "info",
  delete: "danger",
};

const fmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type LogRow = {
  id: string;
  user_id: string | null;
  action: string;
  record_id: string | null;
  details: unknown;
  created_at: string;
};

export function ProfilesActivityLog({
  logs,
  profileMap,
}: {
  logs: LogRow[];
  profileMap: Map<string, string>;
}) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        사용자 변경 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <ul className="divide-y divide-border">
        {logs.map((log) => {
          const tone = ACTION_TONE[log.action] ?? "neutral";
          const action = ACTION_LABEL[log.action] ?? log.action;
          const actor = log.user_id
            ? (profileMap.get(log.user_id) ?? "—")
            : "시스템";
          const target = log.record_id
            ? (profileMap.get(log.record_id) ?? "삭제된 사용자")
            : "—";
          const detail = formatLogDetails(
            "profiles",
            log.action,
            log.details,
          );
          return (
            <li key={log.id} className="flex gap-4 px-5 py-3">
              <div className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">
                {fmt.format(new Date(log.created_at))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                  <strong className="font-semibold">{actor}</strong>
                  <span className="text-muted-foreground">→</span>
                  <strong className="font-semibold">{target}</strong>
                  <StatusBadge tone={tone}>{action}</StatusBadge>
                </div>
                {detail && (
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
