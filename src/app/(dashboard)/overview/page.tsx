import Link from "next/link";
import { AlertTriangle, Package, TrendingDown, TrendingUp } from "lucide-react";

import { DailyTransactionsChart } from "@/components/dashboard/daily-transactions-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { createClient } from "@/lib/supabase/server";
import { normalizeDailySummary } from "@/lib/summary-normalizers";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const supabase = await createClient();

  const [summaryResult, dailySummaryResult, lowStockResult, recentTxResult] =
    await Promise.all([
      supabase.rpc("get_products_summary"),
      supabase.from("daily_transaction_summary").select("day, type, total_quantity, transaction_count"),
      supabase.rpc("get_low_stock_products").limit(9),
      supabase
        .from("transactions")
        .select("id, type, quantity, created_at, products!inner(name, unit)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const summary = (summaryResult.data ?? { total_products: 0, total_quantity: 0, low_stock_count: 0 }) as {
    total_products: number;
    total_quantity: number;
    low_stock_count: number;
  };
  const totalProducts = Number(summary.total_products);
  const totalQuantity = Number(summary.total_quantity);
  const lowStockCount = Number(summary.low_stock_count);
  const lowStockProducts = lowStockResult.data ?? [];

  const dailyData = normalizeDailySummary(dailySummaryResult.data ?? []);
  const last7DaysIn = dailyData.reduce((s, d) => s + d.in, 0);
  const last7DaysOut = dailyData.reduce((s, d) => s + d.out, 0);

  const recentTransactions = recentTxResult.data ?? [];

  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">정원전기 재고관리</h2>
        <p className="text-sm text-muted-foreground mt-1">
          실시간 재고 현황과 입출고 추이를 확인하세요.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="총 품목"
          value={totalProducts.toLocaleString("ko-KR")}
          hint={`재고 합계 ${totalQuantity.toLocaleString("ko-KR")}`}
          icon={<Package className="h-5 w-5" />}
        />
        <KpiCard
          label="재고 부족"
          value={lowStockCount.toLocaleString("ko-KR")}
          hint="최소 재고 이하"
          tone={lowStockCount > 0 ? "critical" : "default"}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KpiCard
          label="최근 7일 입고"
          value={last7DaysIn.toLocaleString("ko-KR")}
          tone="positive"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          label="최근 7일 출고"
          value={last7DaysOut.toLocaleString("ko-KR")}
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>

      {/* Stock Movements chart */}
      <div className="rounded bg-card p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold">입출고 추이</h3>
          <p className="text-xs text-muted-foreground">최근 7일 기준</p>
        </div>
        <DailyTransactionsChart data={dailyData} />
      </div>

      {/* Bottom grid: Low stock + Recent operations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low stock */}
        <div className="rounded bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">재고 부족 품목</h3>
            <span className="text-xs text-muted-foreground">{lowStockCount}건</span>
          </div>
          {lowStockCount === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              재고 부족 품목이 없습니다.
            </p>
          ) : (
            <div className="space-y-0">
              {lowStockProducts.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.category ?? ""} · {p.location ?? "위치 미지정"}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-bold text-destructive">
                      {p.quantity.toLocaleString("ko-KR")}
                      {p.unit && <span className="ml-0.5 text-xs font-normal">{p.unit}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      최소 {p.min_quantity.toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              ))}
              {lowStockCount > 8 && (
                <div className="pt-3 text-center">
                  <Link href="/inventory" className="text-xs text-secondary hover:underline">
                    전체 보기 →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent operations */}
        <div className="rounded bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">최근 입출고</h3>
            <Link href="/transactions" className="text-xs text-secondary hover:underline">
              전체 보기 →
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              아직 입출고 내역이 없습니다.
            </p>
          ) : (
            <div className="space-y-0">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <span>품목</span>
                <span>구분</span>
                <span className="text-right">수량</span>
                <span className="text-right">일시</span>
              </div>
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-center py-3"
                >
                  <span className="text-sm font-medium truncate">{tx.products?.name ?? "-"}</span>
                  <span>
                    <span
                      className={
                        tx.type === "in"
                          ? "inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700"
                          : "inline-block rounded bg-secondary-container/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary"
                      }
                    >
                      {tx.type === "in" ? "입고" : "출고"}
                    </span>
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums">
                    {tx.quantity.toLocaleString("ko-KR")}
                  </span>
                  <span className="text-right text-xs text-muted-foreground tabular-nums">
                    {dateFormatter.format(new Date(tx.created_at))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
