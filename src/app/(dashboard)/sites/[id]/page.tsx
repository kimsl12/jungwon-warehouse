import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { RecordActivityPanel } from "@/components/activity-log/record-activity-panel";
import { SiteStatementButton } from "@/components/sites/site-statement-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const REQUEST_STATUS_META: Record<string, { label: string; tone: string }> = {
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

const dateOnlyFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function SiteDetailPage({ params }: { params: Params }) {
  const { id } = await params;

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

  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, name, address, contact, note, active, created_at, updated_at, start_date, end_date",
    )
    .eq("id", id)
    .maybeSingle();
  if (!site) notFound();

  // 담당자
  const { data: assignmentRows } = await supabase
    .from("profile_sites")
    .select("profile_id")
    .eq("site_id", id);
  const assigneeIds = (assignmentRows ?? []).map((r) => r.profile_id);
  const { data: assignees } = assigneeIds.length
    ? await supabase
        .from("profiles")
        .select("id, name, email, title, phone")
        .in("id", assigneeIds)
    : { data: [] as Array<{
        id: string;
        name: string | null;
        email: string | null;
        title: string | null;
        phone: string | null;
      }> };

  // 최근 자재 신청 10건
  const { data: requests } = await supabase
    .from("material_requests")
    .select(
      "id, status, created_at, is_urgent, created_by, note",
    )
    .eq("site_id", id)
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  const requesterIds = Array.from(
    new Set((requests ?? []).map((r) => r.created_by)),
  );
  const { data: requesters } = requesterIds.length
    ? await supabase.from("profiles").select("id, name").in("id", requesterIds)
    : { data: [] as Array<{ id: string; name: string | null }> };
  const requesterMap = new Map(
    (requesters ?? []).map((p) => [p.id, p.name ?? "—"]),
  );

  // 최근 출고/입고 10건 (transactions.site_id 기반)
  const { data: txs } = await supabase
    .from("transactions")
    .select(
      "id, type, quantity, note, created_at, product_id, products(name, variant, unit)",
    )
    .eq("site_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const requestCount = requests?.length ?? 0;
  const txCount = txs?.length ?? 0;
  const nf = new Intl.NumberFormat("ko-KR");

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/sites"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 현장 목록
        </Link>
      </div>

      {/* 헤더 */}
      <div className="rounded bg-card p-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              현장
            </p>
            <h2 className="text-2xl font-bold tracking-tight mt-1">
              {site.name}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              {site.active ? (
                <span className="inline-block rounded bg-success-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                  활성
                </span>
              ) : (
                <span className="inline-block rounded bg-surface-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  비활성 (준공)
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                등록 {dateOnlyFormatter.format(new Date(site.created_at))}
              </span>
            </div>
          </div>
          <SiteStatementButton siteId={site.id} siteActive={site.active} />
        </div>

        <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm pt-3 border-t">
          <InfoRow label="착공일" value={formatSiteDate(site.start_date)} />
          <InfoRow label="준공일" value={formatSiteDate(site.end_date)} />
          <InfoRow label="주소" value={site.address} span2 />
          <InfoRow label="현장 연락처" value={site.contact} />
          <InfoRow label="메모" value={site.note} />
        </dl>
      </div>

      {/* 담당자 */}
      <section className="rounded bg-card p-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">담당자</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {assignees?.length ?? 0}명 배정
            </p>
          </div>
          <Link
            href="/sites"
            className="text-[11px] font-medium text-secondary hover:underline"
          >
            현장 목록에서 편집 →
          </Link>
        </div>
        {(assignees?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 배정된 담당자가 없습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {(assignees ?? []).map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded border bg-background p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {(a.name ?? "?").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {a.name ?? "—"}
                    {a.title && (
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        {a.title}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {a.phone ?? a.email ?? "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 최근 자재 신청 */}
      <section className="rounded bg-card p-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold tracking-tight">
            최근 자재 신청 ({requestCount})
          </h3>
          <Link
            href={`/requests?site_id=${site.id}`}
            className="text-[11px] font-medium text-secondary hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        {requestCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            이 현장의 자재 신청이 없습니다.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(requests ?? []).map((r) => {
              const meta = REQUEST_STATUS_META[r.status] ?? {
                label: r.status,
                tone: "bg-muted text-muted-foreground",
              };
              return (
                <li key={r.id}>
                  <Link
                    href={`/requests/${r.id}`}
                    className="flex items-center gap-3 rounded border px-3 py-2 hover:bg-surface-low/50 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground tabular-nums w-24 shrink-0">
                      {dateFormatter.format(new Date(r.created_at))}
                    </span>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.tone}`}
                    >
                      {meta.label}
                    </span>
                    {r.is_urgent && (
                      <span className="inline-block rounded bg-danger-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger">
                        긴급
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {r.note ?? "—"}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {requesterMap.get(r.created_by) ?? "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 최근 출고/입고 */}
      <section className="rounded bg-card p-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold tracking-tight">
            최근 입출고 ({txCount})
          </h3>
          <Link
            href={`/transactions?site_id=${site.id}`}
            className="text-[11px] font-medium text-secondary hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        {txCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            이 현장의 입출고 기록이 없습니다.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(txs ?? []).map((t) => {
              const isOut = t.type === "out";
              const productName =
                (t.products as { name?: string } | null)?.name ?? "(삭제됨)";
              const variant =
                (t.products as { variant?: string } | null)?.variant ?? null;
              const unit =
                (t.products as { unit?: string } | null)?.unit ?? "";
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded border px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground tabular-nums w-24 shrink-0">
                    {dateFormatter.format(new Date(t.created_at))}
                  </span>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      isOut
                        ? "bg-danger-bg text-danger"
                        : "bg-success-bg text-success"
                    }`}
                  >
                    {isOut ? "출고" : "입고"}
                  </span>
                  <span className="text-sm flex-1 truncate">
                    {productName}
                    {variant && (
                      <span className="ml-1 text-muted-foreground">
                        · {variant}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {nf.format(t.quantity)}
                    {unit}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RecordActivityPanel
        tableName="sites"
        recordId={site.id}
        title="이 현장의 활동 내역"
      />
    </div>
  );
}

function formatSiteDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return dateOnlyFormatter.format(new Date(y, m - 1, day));
}

function InfoRow({
  label,
  value,
  span2 = false,
}: {
  label: string;
  value: string | null;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <dt className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value ?? "—"}</dd>
    </div>
  );
}
