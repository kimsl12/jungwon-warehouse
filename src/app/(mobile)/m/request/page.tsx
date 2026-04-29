import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  string,
  { label: string; tone: string }
> = {
  submitted: { label: "대기", tone: "bg-amber-100 text-amber-700" },
  approved:  { label: "승인", tone: "bg-blue-100 text-blue-700" },
  fulfilled: { label: "출고완료", tone: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "거절", tone: "bg-red-100 text-red-700" },
  canceled:  { label: "취소", tone: "bg-muted text-muted-foreground" },
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
        <h1 className="text-xl font-bold">자재 신청</h1>
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
          <p className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
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
      className="block min-h-[64px] rounded-md border bg-background p-3 active:bg-muted"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{r.siteName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {dateFormatter.format(new Date(r.createdAt))}
          </p>
          {r.note && <p className="mt-1 text-xs text-muted-foreground truncate">{r.note}</p>}
          {r.status === "rejected" && r.rejectReason && (
            <p className="mt-1 text-xs text-destructive truncate">거절 사유: {r.rejectReason}</p>
          )}
        </div>
        <span
          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 ${meta.tone}`}
        >
          {meta.label}
        </span>
      </div>
    </Link>
  );
}
