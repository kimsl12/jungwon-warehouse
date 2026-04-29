import Link from "next/link";

import {
  ACTION_LABEL,
  actionTone,
  formatLogDetails,
} from "@/lib/activity-log/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  tableName: string;
  recordId: string;
  /** 패널 안에서 보여줄 최근 N건. 기본 20 */
  limit?: number;
  /** 헤더 라벨 (예: "이 발주서의 활동 내역"). 기본 "활동 내역" */
  title?: string;
};

/**
 * 특정 리소스(table_name + record_id)의 활동 로그를 타임라인 형태로 보여주는
 * 서버 컴포넌트. admin 이 아니면 아무것도 렌더링하지 않는다.
 *
 * activity_logs.RLS 가 admin 전용이므로 일반 user 가 호출해도 빈 배열이
 * 반환되지만, 비용 낭비를 막기 위해 role 체크를 먼저 수행한다.
 */
export async function RecordActivityPanel({
  tableName,
  recordId,
  limit = 20,
  title = "활동 내역",
}: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;

  const { data: logs, count } = await supabase
    .from("activity_logs")
    .select("id, action, table_name, record_id, details, user_id, created_at", {
      count: "exact",
    })
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = logs ?? [];

  // 담당자 이름 일괄 조회
  const userIds = Array.from(
    new Set(rows.map((l) => l.user_id).filter((v): v is string => Boolean(v))),
  );
  const profileNameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileNameMap.set(p.id, p.name ?? "—");
    }
  }

  const totalCount = count ?? rows.length;
  const hasMore = totalCount > rows.length;

  return (
    <section className="rounded bg-card p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {totalCount === 0
              ? "기록된 변경 이력이 없습니다."
              : `최근 ${rows.length}건${hasMore ? ` (전체 ${totalCount}건)` : ""}`}
          </p>
        </div>
        {hasMore && (
          <Link
            href={`/activity-log?table=${encodeURIComponent(tableName)}&record_id=${encodeURIComponent(recordId)}`}
            className="text-[11px] font-medium text-secondary hover:underline"
          >
            전체 보기 →
          </Link>
        )}
      </div>

      {rows.length === 0 ? null : (
        <ol className="relative space-y-3 border-l border-dashed pl-4">
          {rows.map((log) => {
            const userName = log.user_id
              ? (profileNameMap.get(log.user_id) ?? "알 수 없음")
              : "시스템";
            return (
              <li key={log.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[20px] top-1 h-2 w-2 rounded-full ring-2 ring-card",
                    log.action === "delete"
                      ? "bg-destructive"
                      : log.action === "create" || log.action === "in"
                        ? "bg-emerald-500"
                        : "bg-secondary",
                  )}
                />
                <div className="flex items-start gap-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      actionTone(log.action),
                    )}
                  >
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dateTimeFormatter.format(new Date(log.created_at))}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {userName}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-foreground/90 break-words">
                  {formatLogDetails(log.table_name, log.action, log.details)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
