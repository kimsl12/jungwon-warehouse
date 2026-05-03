import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutTemplate } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = Promise<{
  status?: string;
  site_id?: string;
  user_id?: string;
  urgent?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "submitted", label: "대기" },
  { value: "approved", label: "승인" },
  { value: "fulfilled", label: "출고완료" },
  { value: "rejected", label: "거절" },
  { value: "canceled", label: "취소" },
];

const STATUS_META: Record<string, { label: string; tone: string }> = {
  submitted: { label: "대기", tone: "bg-warning-bg text-warning" },
  approved: { label: "승인", tone: "bg-info-bg text-info" },
  fulfilled: { label: "출고완료", tone: "bg-success-bg text-success" },
  rejected: { label: "거절", tone: "bg-danger-bg text-danger" },
  canceled: { label: "취소", tone: "bg-muted text-muted-foreground" },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/inventory");

  // Build request query — 긴급 건을 상단 고정하기 위해 is_urgent DESC 선순위 정렬
  let query = supabase
    .from("material_requests")
    .select(
      "id, status, created_at, approved_at, fulfilled_at, site_id, created_by, note, is_urgent, urgent_reason, sites(name)",
      { count: "exact" },
    )
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.site_id) query = query.eq("site_id", params.site_id);
  if (params.user_id) query = query.eq("created_by", params.user_id);
  if (params.urgent === "1") query = query.eq("is_urgent", true);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) {
    const endOfDay = new Date(params.to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  const [requestsResult, sitesResult, profilesResult] = await Promise.all([
    query,
    supabase.from("sites").select("id, name").order("name"),
    supabase.from("profiles").select("id, name").order("name"),
  ]);

  const requests = requestsResult.data ?? [];
  const count = requestsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // item progress 계산 — 목록에 "X / Y" 표시용
  const requestIds = requests.map((r) => r.id);
  const progressMap = new Map<string, { total: number; fulfilled: number }>();
  if (requestIds.length > 0) {
    const { data: items } = await supabase
      .from("material_request_items")
      .select("request_id, requested_quantity, fulfilled_quantity")
      .in("request_id", requestIds);
    for (const it of items ?? []) {
      const agg = progressMap.get(it.request_id) ?? { total: 0, fulfilled: 0 };
      agg.total += it.requested_quantity;
      agg.fulfilled += it.fulfilled_quantity;
      progressMap.set(it.request_id, agg);
    }
  }

  // requester 이름 맵
  const createdByIds = Array.from(new Set(requests.map((r) => r.created_by)));
  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p.name ?? "—"]),
  );

  const current = params.status ?? "all";
  const nf = new Intl.NumberFormat("ko-KR");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            매출 관리
          </p>
          <h2 className="text-2xl font-bold tracking-tight mt-1">자재 신청 관리</h2>
          <p className="text-sm text-muted-foreground mt-0.5">전체 {nf.format(count)}건</p>
        </div>
        <Link
          href="/requests/templates"
          className="inline-flex items-center gap-1.5 rounded border bg-card px-3 py-2 text-xs font-medium hover:bg-surface-low"
        >
          <LayoutTemplate className="h-4 w-4" /> 템플릿 관리
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded bg-card p-1 w-fit">
        {STATUS_OPTIONS.map((s) => {
          const active = current === s.value;
          const href = s.value === "all" ? "/requests" : `/requests?status=${s.value}`;
          return (
            <Link
              key={s.value}
              href={href}
              className={
                "rounded px-3 py-1.5 text-xs font-medium transition-colors " +
                (active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-surface-low")
              }
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Site / user filters (optional) */}
      <form method="get" className="flex flex-wrap items-end gap-2 text-xs">
        <input type="hidden" name="status" value={current === "all" ? "" : current} />
        <Field label="현장">
          <select
            name="site_id"
            defaultValue={params.site_id ?? ""}
            className="h-9 rounded border bg-background px-2 text-sm"
          >
            <option value="">전체</option>
            {(sitesResult.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="담당자">
          <select
            name="user_id"
            defaultValue={params.user_id ?? ""}
            className="h-9 rounded border bg-background px-2 text-sm"
          >
            <option value="">전체</option>
            {(profilesResult.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? "—"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="시작">
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="h-9 rounded border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="종료">
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            className="h-9 rounded border bg-background px-2 text-sm"
          />
        </Field>
        <button
          type="submit"
          className="h-9 rounded bg-foreground px-4 text-xs font-semibold text-background"
        >
          필터 적용
        </button>
        <Link href="/requests" className="h-9 rounded border px-3 text-xs font-medium leading-[2.25rem]">
          초기화
        </Link>
      </form>

      {/* Table */}
      <div className="rounded bg-card overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_160px_130px_110px_90px] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>신청일시</span>
          <span>현장 · 비고</span>
          <span>담당자</span>
          <span className="text-right">진행 (출고/요청)</span>
          <span>상태</span>
          <span className="text-right">작업</span>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            신청 내역이 없습니다.
          </div>
        ) : (
          requests.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.submitted;
            const progress = progressMap.get(r.id) ?? { total: 0, fulfilled: 0 };
            const urgentBgClass =
              r.is_urgent && r.status === "submitted"
                ? "bg-danger-bg/50 hover:bg-danger-bg"
                : "hover:bg-surface-low/50";
            return (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className={`grid grid-cols-[120px_1fr_160px_130px_110px_90px] gap-3 items-center px-5 py-3.5 ${urgentBgClass} transition-colors border-t`}
              >
                <span className="text-xs text-muted-foreground tabular-nums">
                  {dateFormatter.format(new Date(r.created_at))}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.is_urgent && (
                      <span className="mr-1.5 inline-block rounded bg-danger-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-danger">
                        긴급
                      </span>
                    )}
                    {r.sites?.name ?? "—"}
                  </p>
                  {r.note && (
                    <p className="text-xs text-muted-foreground truncate">{r.note}</p>
                  )}
                  {r.is_urgent && r.urgent_reason && (
                    <p className="text-xs text-danger truncate">⚠ {r.urgent_reason}</p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground truncate">
                  {profileMap.get(r.created_by) ?? "—"}
                </span>
                <span className="text-right text-sm tabular-nums">
                  {nf.format(progress.fulfilled)} / {nf.format(progress.total)}
                </span>
                <span>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.tone}`}
                  >
                    {meta.label}
                  </span>
                </span>
                <span className="text-right text-xs text-muted-foreground">열기 →</span>
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const active = p === page;
            const urlParams = new URLSearchParams();
            if (params.status && params.status !== "all") urlParams.set("status", params.status);
            if (params.site_id) urlParams.set("site_id", params.site_id);
            if (params.user_id) urlParams.set("user_id", params.user_id);
            if (params.from) urlParams.set("from", params.from);
            if (params.to) urlParams.set("to", params.to);
            urlParams.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/requests?${urlParams.toString()}`}
                className={
                  "rounded px-2.5 py-1 " +
                  (active
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:bg-surface-high")
                }
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
