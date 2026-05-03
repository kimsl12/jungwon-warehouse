import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  submitted: { label: "대기", tone: "warning" },
  approved: { label: "승인", tone: "info" },
  fulfilled: { label: "출고완료", tone: "success" },
  rejected: { label: "거절", tone: "danger" },
  canceled: { label: "취소", tone: "neutral" },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function MobileRequestListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS가 자기 신청만 반환하도록 필터
  const { data: requests } = await supabase
    .from("material_requests")
    .select(
      "id, status, site_id, note, created_at, approved_at, fulfilled_at, rejected_at, reject_reason, sites(name)",
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (requests ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    siteName: r.sites?.name ?? "—",
    note: r.note,
    createdAt: r.created_at,
    rejectReason: r.reject_reason,
  }));

  const active = rows.filter((r) => r.status === "submitted" || r.status === "approved");
  const past = rows.filter((r) => r.status !== "submitted" && r.status !== "approved");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          자재 신청
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          현장에서 필요한 자재를 공장에 요청합니다.
        </p>
      </div>

      <Link
        href="/m/request/new"
        className="flex min-h-[56px] items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-base active:bg-primary/90"
      >
        <Plus className="h-5 w-5" /> 새 자재 신청
      </Link>

      {/* Active */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          진행 중 ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            진행 중인 신청이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {active.map((r) => (
              <RequestCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            지난 신청 ({past.length})
          </h2>
          <div className="space-y-2">
            {past.map((r) => (
              <RequestCard key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RequestCard({
  r,
}: {
  r: {
    id: string;
    status: string;
    siteName: string;
    note: string | null;
    createdAt: string;
    rejectReason: string | null;
  };
}) {
  const meta = STATUS_META[r.status] ?? STATUS_META.submitted;
  return (
    <Link
      href={`/m/request/${r.id}`}
      className="block min-h-[64px] rounded-lg border border-border bg-card p-3 shadow-xs transition-colors active:bg-muted"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{r.siteName}</p>
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
            {dateFormatter.format(new Date(r.createdAt))}
          </p>
          {r.note && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {r.note}
            </p>
          )}
          {r.status === "rejected" && r.rejectReason && (
            <p className="mt-1 truncate text-xs text-destructive">
              거절 사유: {r.rejectReason}
            </p>
          )}
        </div>
        <StatusBadge tone={meta.tone} dot>
          {meta.label}
        </StatusBadge>
      </div>
    </Link>
  );
}
