import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

/**
 * 관리자 대시보드 상단의 전역 알림 띠.
 * 현재 대기 중인 자재 신청(제출 상태)을 긴급/일반으로 나눠서 카운트 표시.
 *
 * Server component — 페이지 네비게이션 시 자동 갱신됨.
 * admin 역할만 렌더됨 (layout 에서 조건부로 호출).
 */
export async function RequestAlertBar() {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_dashboard_alert_counts");
  const counts = (data ?? { urgent: 0, pending: 0 }) as {
    urgent: number;
    pending: number;
  };

  const urgent = Number(counts.urgent) || 0;
  const pending = Number(counts.pending) || 0;

  // 대기 건이 하나도 없으면 숨김
  if (urgent === 0 && pending === 0) return null;

  return (
    <div className="sticky top-14 z-20 flex items-center gap-3 border-b border-border bg-warning-bg/40 px-6 py-2 text-xs">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="font-semibold text-foreground">대기 중 자재 신청</span>
        {urgent > 0 && (
          <Link
            href="/requests?status=submitted&urgent=1"
            className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2.5 py-1 font-semibold text-danger transition-colors hover:bg-danger-bg/70"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            긴급 {urgent}건
          </Link>
        )}
        {pending > 0 && (
          <Link
            href="/requests?status=submitted"
            className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-1 font-semibold text-warning transition-colors hover:bg-warning-bg/70"
          >
            <Clock className="h-3.5 w-3.5" />
            일반 {pending}건
          </Link>
        )}
      </div>
      <Link
        href="/requests"
        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
      >
        전체 보기 →
      </Link>
    </div>
  );
}
