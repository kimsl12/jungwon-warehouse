import Link from "next/link";

import { DailyTransactionsChart } from "@/components/dashboard/daily-transactions-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { normalizeDailySummary } from "@/lib/summary-normalizers";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const supabase = await createClient();

  const [productsAggResult, dailySummaryResult, lowStockResult, recentTxResult] =
    await Promise.all([
      supabase.from("products").select("id, quantity, min_quantity"),
      supabase.from("daily_transaction_summary").select("day, type, total_quantity, transaction_count"),
      supabase
        .from("products")
        .select("id, name, quantity, min_quantity, unit, location")
        .gt("min_quantity", 0)
        .order("name"),
      supabase
        .from("transactions")
        .select("id, type, quantity, created_at, products!inner(name, unit)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  // Inventory KPIs
  const allProducts = productsAggResult.data ?? [];
  const totalProducts = allProducts.length;
  const totalQuantity = allProducts.reduce((sum, p) => sum + (p.quantity ?? 0), 0);
  const lowStockProducts = (lowStockResult.data ?? []).filter(
    (p) => p.quantity <= p.min_quantity,
  );
  const lowStockCount = lowStockProducts.length;

  // Daily chart data
  const dailyData = normalizeDailySummary(dailySummaryResult.data ?? []);
  const last7DaysIn = dailyData.reduce((s, d) => s + d.in, 0);
  const last7DaysOut = dailyData.reduce((s, d) => s + d.out, 0);

  const recentTransactions = recentTxResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
        <p className="text-sm text-muted-foreground">재고 현황과 입출고 추이를 확인하세요.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="총 품목"
          value={totalProducts.toLocaleString("ko-KR")}
          hint={`재고 합계 ${totalQuantity.toLocaleString("ko-KR")}`}
        />
        <KpiCard
          label="재고 부족"
          value={lowStockCount.toLocaleString("ko-KR")}
          hint="최소 재고 이하"
          tone={lowStockCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="최근 7일 입고"
          value={last7DaysIn.toLocaleString("ko-KR")}
          tone="positive"
        />
        <KpiCard label="최근 7일 출고" value={last7DaysOut.toLocaleString("ko-KR")} />
      </div>

      {/* Daily chart */}
      <Card>
        <CardHeader>
          <CardTitle>최근 7일 입출고</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyTransactionsChart data={dailyData} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low stock list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>재고 부족 품목</span>
              <span className="text-xs font-normal text-muted-foreground">
                {lowStockCount}건
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockCount === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                재고 부족 품목이 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {lowStockProducts.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.location ?? "보관 위치 미지정"}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="font-semibold text-destructive">
                        {p.quantity.toLocaleString("ko-KR")}
                        {p.unit && (
                          <span className="ml-0.5 text-xs font-normal">{p.unit}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        최소 {p.min_quantity.toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </li>
                ))}
                {lowStockCount > 8 && (
                  <li className="pt-2 text-center text-xs text-muted-foreground">
                    외 {lowStockCount - 8}건 —{" "}
                    <Link href="/inventory" className="underline">
                      재고 페이지에서 확인
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>최근 입출고</span>
              <Link
                href="/transactions"
                className="text-xs font-normal text-muted-foreground underline-offset-2 hover:underline"
              >
                전체 →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                아직 입출고 내역이 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {recentTransactions.map((tx) => {
                  const created = new Date(tx.created_at);
                  return (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            tx.type === "in"
                              ? "rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }
                        >
                          {tx.type === "in" ? "입고" : "출고"}
                        </span>
                        <span className="font-medium">{tx.products?.name ?? "-"}</span>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="font-semibold">
                          {tx.quantity.toLocaleString("ko-KR")}
                          {tx.products?.unit && (
                            <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                              {tx.products.unit}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {created.getMonth() + 1}/{created.getDate()}{" "}
                          {String(created.getHours()).padStart(2, "0")}:
                          {String(created.getMinutes()).padStart(2, "0")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
