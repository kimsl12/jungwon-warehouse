import Link from "next/link";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from "lucide-react";

import { MonthlyTransactionsChart } from "@/components/dashboard/monthly-transactions-chart";
import {
  TopOutgoingChart,
  type TopOutgoingPoint,
} from "@/components/dashboard/top-outgoing-chart";
import { ReportsRangeFilter } from "@/components/dashboard/reports-range-filter";
import { KPICard } from "@/components/shared/kpi-card";
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

type VendorInboundRow = {
  vendor_id: string;
  vendor_name: string;
  total_quantity: number;
  total_amount: number;
  po_count: number;
  received_po_count: number;
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

  const [
    monthlyResult,
    topOutgoingResult,
    outByUserResult,
    outBySiteResult,
    vendorInboundResult,
    profilesResult,
  ] = await Promise.all([
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
      (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, string>,
      ) => Promise<{ data: VendorInboundRow[] | null }>)("get_vendor_inbound_by_period", {
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
  const vendorInbound = vendorInboundResult.data ?? [];
  const nf = new Intl.NumberFormat("ko-KR");

  const totalIn12mo = monthlyData.reduce((s, m) => s + m.in, 0);
  const totalOut12mo = monthlyData.reduce((s, m) => s + m.out, 0);
  const totalLoss12mo = monthlyData.reduce((s, m) => s + m.loss, 0);
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const monthOverMonthOut =
    previousMonth && previousMonth.out > 0
      ? ((currentMonth.out - previousMonth.out) / previousMonth.out) * 100
      : null;

  const rangeParams = new URLSearchParams({ type: "out", from: fromYmd, to: toYmd });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        최근 12개월 입출고 추이와 담당자·현장별 출고 집계
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="12개월 입고"
          value={totalIn12mo.toLocaleString("ko-KR")}
          icon={ArrowDownToLine}
          iconAccent="success"
        />
        <KPICard
          label="12개월 출고"
          value={totalOut12mo.toLocaleString("ko-KR")}
          icon={ArrowUpFromLine}
          iconAccent="brand"
        />
        <KPICard
          label="12개월 분실"
          value={totalLoss12mo.toLocaleString("ko-KR")}
          icon={AlertTriangle}
          iconAccent="warning"
        />
        <KPICard
          label="이번 달 출고"
          value={currentMonth?.out.toLocaleString("ko-KR") ?? "0"}
          icon={TrendingUp}
          iconAccent="info"
          delta={
            monthOverMonthOut !== null
              ? `${monthOverMonthOut >= 0 ? "+" : ""}${monthOverMonthOut.toFixed(1)}%`
              : undefined
          }
          deltaTone={
            monthOverMonthOut !== null && monthOverMonthOut >= 0
              ? "warning"
              : "success"
          }
          deltaCaption="전월 대비"
        />
      </div>

      {/* Monthly chart — fixed 12 months */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <h3 className="text-lg font-bold mb-4">월별 입출고 추이</h3>
        <MonthlyTransactionsChart data={monthlyData} />
      </div>

      {/* Top outgoing — all time */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
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
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
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

          <div className="rounded-lg border border-border bg-card p-5 shadow-xs lg:col-span-2">
            <div className="mb-3 flex items-baseline justify-between">
              <h4 className="text-sm font-bold text-muted-foreground">
                거래처별 입고 (PO 기반)
              </h4>
              <Link
                href={`/purchase-orders?status=received`}
                prefetch={false}
                className="text-[11px] font-medium text-secondary hover:underline"
              >
                발주서 목록 →
              </Link>
            </div>
            {vendorInbound.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                선택 기간에 입고된 발주서가 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-[1fr_120px_140px_100px] gap-3 text-xs">
                <div className="contents text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>거래처</span>
                  <span className="text-right">수량</span>
                  <span className="text-right">금액 (원)</span>
                  <span className="text-right">PO 건수</span>
                </div>
                {vendorInbound.map((row) => (
                  <Link
                    key={row.vendor_id}
                    href={`/vendors/${row.vendor_id}`}
                    prefetch={false}
                    className="contents group"
                  >
                    <span className="border-t border-border/60 py-2 text-sm font-medium text-foreground group-hover:underline">
                      {row.vendor_name}
                    </span>
                    <span className="border-t border-border/60 py-2 text-right text-sm tabular-nums">
                      {nf.format(Number(row.total_quantity ?? 0))}
                    </span>
                    <span className="border-t border-border/60 py-2 text-right text-sm font-semibold tabular-nums">
                      {nf.format(Number(row.total_amount ?? 0))}
                    </span>
                    <span className="border-t border-border/60 py-2 text-right text-xs text-muted-foreground tabular-nums">
                      {nf.format(Number(row.received_po_count ?? 0))}/
                      {nf.format(Number(row.po_count ?? 0))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
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
