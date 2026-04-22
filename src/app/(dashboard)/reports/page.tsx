import Link from "next/link";

import { MonthlyTransactionsChart } from "@/components/dashboard/monthly-transactions-chart";
import {
  TopOutgoingChart,
  type TopOutgoingPoint,
} from "@/components/dashboard/top-outgoing-chart";
import { ReportsRangeFilter } from "@/components/dashboard/reports-range-filter";
import { createClient } from "@/lib/supabase/server";
import { normalizeMonthlySummary } from "@/lib/summary-normalizers";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string; to?: string }>;

type OutgoingByUserRow = {
  user_id: string | null;
  transaction_count: number;
  total_quantity: number;
};

type OutgoingBySiteRow = {
  site_id: string | null;
  site_name: string | null;
  transaction_count: number;
  total_quantity: number;
};

function isYmd(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function defaultFromYmd(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d.toISOString().slice(0, 10);
}

function defaultToYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIsoStart(ymd: string): string {
  return new Date(`${ymd}T00:00:00+09:00`).toISOString();
}

function toIsoEnd(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00+09:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const fromYmd = isYmd(params.from) ? params.from : defaultFromYmd();
  const toYmd = isYmd(params.to) ? params.to : defaultToYmd();
  const pFrom = toIsoStart(fromYmd);
  const pTo = toIsoEnd(toYmd);

  const supabase = await createClient();

  const [monthlyResult, topOutgoingResult, outByUserResult, outBySiteResult, profilesResult] =
    await Promise.all([
      supabase.from("monthly_transaction_summary").select("month, type, total_quantity, transaction_count"),
      supabase.from("top_products_by_outgoing").select("product_id, name, category, total_outgoing"),
      // New RPCs added in migration 20260422120000. Cast because types.ts is
      // regenerated out-of-band via `pnpm gen:types`.
      (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, string>,
      ) => Promise<{ data: OutgoingByUserRow[] | null }>)("get_outgoing_by_user", {
        p_from: pFrom,
        p_to: pTo,
      }),
      (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, string>,
      ) => Promise<{ data: OutgoingBySiteRow[] | null }>)("get_outgoing_by_site", {
        p_from: pFrom,
        p_to: pTo,
      }),
      supabase.from("profiles").select("id, name"),
    ]);

  const monthlyData = normalizeMonthlySummary(monthlyResult.data ?? []);
  const topOutgoing: TopOutgoingPoint[] = (topOutgoingResult.data ?? [])
    .filter((r): r is { product_id: string; name: string; category: string | null; total_outgoing: number } =>
      Boolean(r.name && r.total_outgoing != null),
    )
    .map((r) => ({ name: r.name, total: Number(r.total_outgoing) }));

  const outByUser = outByUserResult.data ?? [];
  const outBySite = outBySiteResult.data ?? [];

  const totalIn12mo = monthlyData.reduce((s, m) => s + m.in, 0);
  const totalOut12mo = monthlyData.reduce((s, m) => s + m.out, 0);
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const monthOverMonthOut =
    previousMonth && previousMonth.out > 0
      ? ((currentMonth.out - previousMonth.out) / previousMonth.out) * 100
      : null;

  const rangeParams = new URLSearchParams({ type: "out", from: fromYmd, to: toYmd });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">분석</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">리포트</h2>
        <p className="text-sm text-muted-foreground mt-0.5">최근 12개월 입출고 추이와 담당자·현장별 출고 집계</p>
      </div>

      {/* KPI — fixed 12 months */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">12개월 입고</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums text-emerald-600">{totalIn12mo.toLocaleString("ko-KR")}</p>
        </div>
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">12개월 출고</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums">{totalOut12mo.toLocaleString("ko-KR")}</p>
        </div>
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">이번 달 출고</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums">{currentMonth?.out.toLocaleString("ko-KR") ?? "0"}</p>
          {monthOverMonthOut !== null && (
            <p className={monthOverMonthOut >= 0 ? "text-xs font-medium text-secondary mt-1" : "text-xs font-medium text-emerald-600 mt-1"}>
              {monthOverMonthOut >= 0 ? "+" : ""}{monthOverMonthOut.toFixed(1)}% 전월 대비
            </p>
          )}
        </div>
      </div>

      {/* Monthly chart — fixed 12 months */}
      <div className="rounded bg-card p-6">
        <h3 className="text-lg font-bold mb-4">월별 입출고 추이</h3>
        <MonthlyTransactionsChart data={monthlyData} />
      </div>

      {/* Top outgoing — all time */}
      <div className="rounded bg-card p-6">
        <h3 className="text-lg font-bold mb-4">출고 상위 품목 (Top 10)</h3>
        {topOutgoing.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">아직 출고 내역이 없습니다.</p>
        ) : (
          <TopOutgoingChart data={topOutgoing} />
        )}
      </div>

      {/* Drill-down: by user / by site with date range */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">담당자 · 현장별 출고</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              선택한 기간의 출고만 집계합니다. 행을 클릭하면 해당 출고 내역으로 이동합니다.
            </p>
          </div>
          <ReportsRangeFilter initialFrom={fromYmd} initialTo={toYmd} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded bg-card p-6">
            <h4 className="text-sm font-bold mb-3 text-muted-foreground">인원별 출고</h4>
            {outByUser.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">선택 기간에 출고 내역이 없습니다.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {outByUser.map((row) => {
                  const name =
                    (profilesResult.data ?? []).find((p) => p.id === row.user_id)?.name ?? "시스템";
                  const href = row.user_id
                    ? `/transactions?${new URLSearchParams({ ...Object.fromEntries(rangeParams), user_id: row.user_id }).toString()}`
                    : `/transactions?${rangeParams.toString()}`;
                  return (
                    <Link
                      key={row.user_id ?? "__null"}
                      href={href}
                      prefetch={false}
                      className="flex items-center justify-between py-3 px-2 -mx-2 rounded hover:bg-surface-low/60 transition-colors"
                    >
                      <span className="text-sm font-medium">{name}</span>
                      <div className="text-right tabular-nums">
                        <span className="text-sm font-bold">
                          {Number(row.total_quantity ?? 0).toLocaleString("ko-KR")}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({Number(row.transaction_count ?? 0).toLocaleString("ko-KR")}건)
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded bg-card p-6">
            <h4 className="text-sm font-bold mb-3 text-muted-foreground">현장별 출고</h4>
            {outBySite.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">선택 기간에 출고 내역이 없습니다.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {outBySite.map((row) => {
                  const href = row.site_id
                    ? `/transactions?${new URLSearchParams({ ...Object.fromEntries(rangeParams), site_id: row.site_id }).toString()}`
                    : `/transactions?${rangeParams.toString()}`;
                  return (
                    <Link
                      key={row.site_id ?? "__null"}
                      href={href}
                      prefetch={false}
                      className="flex items-center justify-between py-3 px-2 -mx-2 rounded hover:bg-surface-low/60 transition-colors"
                    >
                      <span className="text-sm font-medium">{row.site_name ?? "미지정"}</span>
                      <div className="text-right tabular-nums">
                        <span className="text-sm font-bold">
                          {Number(row.total_quantity ?? 0).toLocaleString("ko-KR")}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({Number(row.transaction_count ?? 0).toLocaleString("ko-KR")}건)
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
