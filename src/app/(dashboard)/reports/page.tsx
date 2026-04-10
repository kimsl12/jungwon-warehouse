import { MonthlyTransactionsChart } from "@/components/dashboard/monthly-transactions-chart";
import {
  TopOutgoingChart,
  type TopOutgoingPoint,
} from "@/components/dashboard/top-outgoing-chart";
import { createClient } from "@/lib/supabase/server";
import { normalizeMonthlySummary } from "@/lib/summary-normalizers";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [monthlyResult, topOutgoingResult, outByUserResult, outBySiteResult, profilesResult] =
    await Promise.all([
      supabase.from("monthly_transaction_summary").select("month, type, total_quantity, transaction_count"),
      supabase.from("top_products_by_outgoing").select("product_id, name, category, total_outgoing"),
      supabase.from("outgoing_by_user").select("user_id, transaction_count, total_quantity"),
      supabase.from("outgoing_by_site").select("site_id, site_name, transaction_count, total_quantity"),
      supabase.from("profiles").select("id, name"),
    ]);

  const monthlyData = normalizeMonthlySummary(monthlyResult.data ?? []);
  const topOutgoing: TopOutgoingPoint[] = (topOutgoingResult.data ?? [])
    .filter((r): r is { product_id: string; name: string; category: string | null; total_outgoing: number } =>
      Boolean(r.name && r.total_outgoing != null),
    )
    .map((r) => ({ name: r.name, total: Number(r.total_outgoing) }));

  const totalIn12mo = monthlyData.reduce((s, m) => s + m.in, 0);
  const totalOut12mo = monthlyData.reduce((s, m) => s + m.out, 0);
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const monthOverMonthOut =
    previousMonth && previousMonth.out > 0
      ? ((currentMonth.out - previousMonth.out) / previousMonth.out) * 100
      : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">분석</p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">리포트</h2>
        <p className="text-sm text-muted-foreground mt-0.5">최근 12개월 입출고 추이</p>
      </div>

      {/* KPI */}
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

      {/* Monthly chart */}
      <div className="rounded bg-card p-6">
        <h3 className="text-lg font-bold mb-4">월별 입출고 추이</h3>
        <MonthlyTransactionsChart data={monthlyData} />
      </div>

      {/* Top outgoing */}
      <div className="rounded bg-card p-6">
        <h3 className="text-lg font-bold mb-4">출고 상위 품목 (Top 10)</h3>
        {topOutgoing.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">아직 출고 내역이 없습니다.</p>
        ) : (
          <TopOutgoingChart data={topOutgoing} />
        )}
      </div>

      {/* By user / by site */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded bg-card p-6">
          <h3 className="text-lg font-bold mb-4">인원별 출고</h3>
          {(outByUserResult.data ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">출고 내역이 없습니다.</p>
          ) : (
            <div className="space-y-0">
              {(outByUserResult.data ?? []).map((row) => {
                const name = (profilesResult.data ?? []).find((p) => p.id === row.user_id)?.name ?? "시스템";
                return (
                  <div key={row.user_id ?? "__null"} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">{name}</span>
                    <div className="text-right tabular-nums">
                      <span className="text-sm font-bold">{Number(row.total_quantity ?? 0).toLocaleString("ko-KR")}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({Number(row.transaction_count ?? 0).toLocaleString("ko-KR")}건)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded bg-card p-6">
          <h3 className="text-lg font-bold mb-4">현장별 출고</h3>
          {(outBySiteResult.data ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">출고 내역이 없습니다.</p>
          ) : (
            <div className="space-y-0">
              {(outBySiteResult.data ?? []).map((row) => (
                <div key={row.site_id ?? "__null"} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium">{row.site_name ?? "미지정"}</span>
                  <div className="text-right tabular-nums">
                    <span className="text-sm font-bold">{Number(row.total_quantity ?? 0).toLocaleString("ko-KR")}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({Number(row.transaction_count ?? 0).toLocaleString("ko-KR")}건)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
