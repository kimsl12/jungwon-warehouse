import { MonthlyTransactionsChart } from "@/components/dashboard/monthly-transactions-chart";
import {
  TopOutgoingChart,
  type TopOutgoingPoint,
} from "@/components/dashboard/top-outgoing-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { normalizeMonthlySummary } from "@/lib/summary-normalizers";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [monthlyResult, topOutgoingResult] = await Promise.all([
    supabase.from("monthly_transaction_summary").select("month, type, total_quantity"),
    supabase
      .from("top_products_by_outgoing")
      .select("product_id, name, category, total_outgoing"),
  ]);

  const monthlyData = normalizeMonthlySummary(monthlyResult.data ?? []);

  const topOutgoing: TopOutgoingPoint[] = (topOutgoingResult.data ?? [])
    .filter((r): r is { product_id: string; name: string; category: string | null; total_outgoing: number } =>
      Boolean(r.name && r.total_outgoing != null),
    )
    .map((r) => ({
      name: r.name,
      total: Number(r.total_outgoing),
    }));

  // Quick KPIs derived from the monthly data
  const totalIn12mo = monthlyData.reduce((s, m) => s + m.in, 0);
  const totalOut12mo = monthlyData.reduce((s, m) => s + m.out, 0);
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const monthOverMonthOut =
    previousMonth && previousMonth.out > 0
      ? ((currentMonth.out - previousMonth.out) / previousMonth.out) * 100
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">리포트</h2>
        <p className="text-sm text-muted-foreground">
          최근 12개월 입출고 추이와 출고 빈도가 높은 품목을 확인하세요.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-1.5 py-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              12개월 입고 합계
            </p>
            <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {totalIn12mo.toLocaleString("ko-KR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1.5 py-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              12개월 출고 합계
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {totalOut12mo.toLocaleString("ko-KR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1.5 py-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              이번 달 출고 (전월 대비)
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {currentMonth?.out.toLocaleString("ko-KR") ?? "0"}
            </p>
            {monthOverMonthOut !== null && (
              <p
                className={
                  monthOverMonthOut >= 0
                    ? "text-xs font-medium text-amber-600 dark:text-amber-400"
                    : "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                }
              >
                {monthOverMonthOut >= 0 ? "▲" : "▼"} {Math.abs(monthOverMonthOut).toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>월별 입출고 추이 (최근 12개월)</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTransactionsChart data={monthlyData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>출고 상위 품목 (전체 기간 Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {topOutgoing.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              아직 출고 내역이 없습니다.
            </p>
          ) : (
            <TopOutgoingChart data={topOutgoing} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
