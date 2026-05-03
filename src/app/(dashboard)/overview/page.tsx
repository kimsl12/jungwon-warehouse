import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  HardHat,
  Package,
  Truck,
} from "lucide-react";

import { DailyTransactionsChart } from "@/components/dashboard/daily-transactions-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { KPICard } from "@/components/shared/kpi-card";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { ACTION_LABEL, TABLE_LABEL, formatLogDetails } from "@/lib/activity-log/format";
import { createClient } from "@/lib/supabase/server";
import { normalizeDailySummary } from "@/lib/summary-normalizers";

export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, StatusTone> = {
  create: "success",
  update: "info",
  delete: "danger",
  in: "success",
  out: "brand",
};

const relTime = new Intl.RelativeTimeFormat("ko-KR", { numeric: "auto" });

function timeAgo(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMin) < 60) return relTime.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return relTime.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return relTime.format(diffDay, "day");
}

export default async function OverviewPage() {
  const supabase = await createClient();

  const [
    summaryResult,
    dailyResult,
    lowStockResult,
    sitesResult,
    ordersCountResult,
    activityResult,
  ] = await Promise.all([
    supabase.rpc("get_products_summary"),
    supabase
      .from("daily_transaction_summary")
      .select("day, type, total_quantity, transaction_count"),
    supabase.rpc("get_low_stock_products").limit(8),
    supabase
      .from("sites")
      .select("id, name, active")
      .eq("active", true)
      .order("name")
      .limit(4),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["sent", "partial"]),
    supabase
      .from("activity_logs")
      .select("id, user_id, action, table_name, record_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const summary = (summaryResult.data ?? {
    total_products: 0,
    total_quantity: 0,
    low_stock_count: 0,
  }) as {
    total_products: number;
    total_quantity: number;
    low_stock_count: number;
  };

  const totalProducts = Number(summary.total_products);
  const totalQuantity = Number(summary.total_quantity);
  const lowStockCount = Number(summary.low_stock_count);
  const lowStockProducts = lowStockResult.data ?? [];
  const sites = sitesResult.data ?? [];
  const pendingOrders = ordersCountResult.count ?? 0;

  const dailyData = normalizeDailySummary(dailyResult.data ?? []);
  const last7DaysIn = dailyData.reduce((s, d) => s + d.in, 0);
  const last7DaysOut = dailyData.reduce((s, d) => s + d.out, 0);

  const activityLogs = activityResult.data ?? [];
  const userIds = Array.from(
    new Set(activityLogs.map((l) => l.user_id).filter(Boolean) as string[]),
  );
  const profilesQuery = userIds.length
    ? await supabase.from("profiles").select("id, name").in("id", userIds)
    : { data: [] as Array<{ id: string; name: string | null }> };
  const profileMap = new Map(
    (profilesQuery.data ?? []).map((p) => [p.id, p.name ?? "—"]),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="총 재고 SKU"
          value={totalProducts.toLocaleString("ko-KR")}
          icon={Package}
          iconAccent="brand"
        >
          <p className="text-[11.5px] text-muted-foreground">
            재고 합계 {totalQuantity.toLocaleString("ko-KR")}
          </p>
        </KPICard>
        <KPICard
          label="재고 부족"
          value={lowStockCount.toLocaleString("ko-KR")}
          icon={AlertTriangle}
          iconAccent={lowStockCount > 0 ? "danger" : "brand"}
          delta={lowStockCount > 0 ? "확인 필요" : "정상"}
          deltaTone={lowStockCount > 0 ? "danger" : "success"}
          deltaCaption=""
        />
        <KPICard
          label="최근 7일 입고"
          value={last7DaysIn.toLocaleString("ko-KR")}
          icon={ArrowDownToLine}
          iconAccent="success"
        >
          <p className="text-[11.5px] text-muted-foreground">
            출고 {last7DaysOut.toLocaleString("ko-KR")}건
          </p>
        </KPICard>
        <KPICard
          label="진행 중 발주"
          value={pendingOrders.toLocaleString("ko-KR")}
          icon={Truck}
          iconAccent="info"
          delta={pendingOrders > 0 ? `${pendingOrders}건 진행` : "없음"}
          deltaTone="info"
          deltaCaption=""
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                입출고 추이
              </p>
              <h3 className="mt-1 font-display text-[18px] font-semibold tracking-tight">
                지난 7일
              </h3>
            </div>
            <div className="flex items-baseline gap-5">
              <div>
                <div className="text-[11.5px] text-muted-foreground">입고</div>
                <div className="font-display text-[22px] font-semibold tabular-nums tracking-tight text-success">
                  {last7DaysIn.toLocaleString("ko-KR")}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">건</span>
                </div>
              </div>
              <div>
                <div className="text-[11.5px] text-muted-foreground">출고</div>
                <div className="font-display text-[22px] font-semibold tabular-nums tracking-tight text-brand-600">
                  {last7DaysOut.toLocaleString("ko-KR")}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">건</span>
                </div>
              </div>
            </div>
          </div>
          <DailyTransactionsChart data={dailyData} />
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-semibold tracking-tight">
              현장 현황
            </h3>
            <Link href="/sites" className="text-xs text-primary hover:underline">
              전체
            </Link>
          </div>
          {sites.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              운영 중인 현장이 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-dashed divide-border">
              {sites.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <HardHat className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/sites/${s.id}`}
                      className="block truncate text-[13px] font-semibold leading-tight hover:underline"
                    >
                      {s.name}
                    </Link>
                    <p className="text-[11.5px] text-muted-foreground">운영 중</p>
                  </div>
                  <StatusBadge tone="info" dot>
                    진행중
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-[15px] font-semibold tracking-tight">
                재고 부족 알림
              </h3>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                최소 재고 미만 {lowStockCount.toLocaleString("ko-KR")}건
              </p>
            </div>
            <Link
              href="/purchase-orders/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Truck className="size-3.5" />
              일괄 발주
            </Link>
          </div>
          {lowStockCount === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              재고 부족 품목이 없습니다.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10.5px] font-medium uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">품목</th>
                  <th className="px-3 py-2.5 text-left font-medium">위치</th>
                  <th className="px-3 py-2.5 text-right font-medium">현재</th>
                  <th className="px-3 py-2.5 text-right font-medium">최소</th>
                  <th className="px-5 py-2.5 text-left font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-5 py-3">
                      <Link
                        href={`/inventory?search=${encodeURIComponent(p.name)}`}
                        className="font-semibold hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.variant && (
                        <div className="text-[11.5px] text-muted-foreground">
                          {p.variant}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                      {p.location ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-warning">
                      {p.quantity}
                      <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                        {p.unit ?? ""}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {p.min_quantity}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        tone={p.quantity === 0 ? "danger" : "warning"}
                        dot
                      >
                        {p.quantity === 0 ? "재고 소진" : "부족"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-semibold tracking-tight">
              최근 활동
            </h3>
            <Link
              href="/activity-log"
              className="text-xs text-primary hover:underline"
            >
              전체
            </Link>
          </div>
          {activityLogs.length === 0 ? (
            <EmptyState
              icon={Package}
              title="활동 내역이 없습니다"
              description="입출고·자재 신청 등의 작업이 발생하면 여기에 표시됩니다."
            />
          ) : (
            <ul className="divide-y divide-dashed divide-border">
              {activityLogs.map((log) => {
                const tone = ACTION_TONE[log.action] ?? "neutral";
                const actionLabel = ACTION_LABEL[log.action] ?? log.action;
                const tableLabel = TABLE_LABEL[log.table_name] ?? log.table_name;
                const userName = log.user_id
                  ? profileMap.get(log.user_id) ?? "—"
                  : "시스템";
                const detail = formatLogDetails(
                  log.table_name,
                  log.action,
                  log.details,
                );
                return (
                  <li
                    key={log.id}
                    className="flex gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="w-12 shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground">
                      {timeAgo(new Date(log.created_at))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-1.5 text-[12.5px]">
                        <strong className="font-semibold">{userName}</strong>
                        <span className="text-muted-foreground">·</span>
                        <StatusBadge tone={tone}>{actionLabel}</StatusBadge>
                      </div>
                      <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                        {tableLabel}
                        {detail ? ` · ${detail}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
