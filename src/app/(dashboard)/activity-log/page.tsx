import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";

import { ActivityLogPagination } from "@/components/activity-log/activity-log-pagination";
import { ActivityLogTable } from "@/components/activity-log/activity-log-table";
import { TABLE_LABEL } from "@/lib/activity-log/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  page?: string;
  table?: string;
  action?: string;
  record_id?: string;
}>;

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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
  if (profile?.role !== "admin") {
    redirect("/overview");
  }

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;
  const tableFilter = params.table?.trim() || "";
  const actionFilter = params.action?.trim() || "";
  const recordIdFilter = params.record_id?.trim() || "";

  let query = supabase
    .from("activity_logs")
    .select(
      "id, action, table_name, record_id, details, user_id, created_at",
      {
        count: "exact",
      },
    )
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (tableFilter) query = query.eq("table_name", tableFilter);
  if (actionFilter) query = query.eq("action", actionFilter);
  if (recordIdFilter) query = query.eq("record_id", recordIdFilter);

  const logsResult = await query;

  const logs = logsResult.data ?? [];
  const totalCount = logsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Resolve user names for the visible logs (FK points to auth.users)
  const userIds = Array.from(
    new Set(
      logs.map((l) => l.user_id).filter((id): id is string => Boolean(id)),
    ),
  );
  let profileNameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    profileNameMap = new Map((profileRows ?? []).map((p) => [p.id, p.name]));
  }

  // record_id 필터가 있을 때, 해당 리소스의 이름을 보여주기 위해 조회.
  // 테이블별로 컬럼이 달라 분기.
  let resourceLabel: string | null = null;
  if (recordIdFilter && tableFilter) {
    resourceLabel = await resolveRecordLabel(
      supabase,
      tableFilter,
      recordIdFilter,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">활동 로그</h2>
        <p className="text-sm text-muted-foreground">
          전체 {totalCount.toLocaleString("ko-KR")}건 — 모든 데이터 변경 이력은
          자동으로 기록됩니다.
        </p>
      </div>

      {recordIdFilter && (
        <div className="flex items-center gap-2 rounded border border-secondary/30 bg-secondary/5 px-3 py-2 text-xs">
          <span className="font-semibold uppercase tracking-widest text-secondary">
            특정 리소스 필터
          </span>
          <span className="text-foreground">
            {TABLE_LABEL[tableFilter] ?? tableFilter} ·{" "}
            <span className="font-medium">
              {resourceLabel ?? recordIdFilter.slice(0, 8)}
            </span>
          </span>
          <Link
            href={
              actionFilter
                ? `/activity-log?action=${actionFilter}`
                : "/activity-log"
            }
            className="ml-auto inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-surface-low"
          >
            <X className="h-3 w-3" /> 필터 해제
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterPill
          label="전체"
          href="/activity-log"
          active={
            !tableFilter && !actionFilter && !recordIdFilter
          }
        />
        <FilterPill
          label="재고 변경"
          href="/activity-log?table=products"
          active={tableFilter === "products" && !recordIdFilter}
        />
        <FilterPill
          label="입출고"
          href="/activity-log?table=transactions"
          active={tableFilter === "transactions" && !recordIdFilter}
        />
        <FilterPill
          label="현장"
          href="/activity-log?table=sites"
          active={tableFilter === "sites" && !recordIdFilter}
        />
        <FilterPill
          label="거래처"
          href="/activity-log?table=vendors"
          active={tableFilter === "vendors" && !recordIdFilter}
        />
        <FilterPill
          label="발주서"
          href="/activity-log?table=purchase_orders"
          active={tableFilter === "purchase_orders" && !recordIdFilter}
        />
        <FilterPill
          label="자재신청"
          href="/activity-log?table=material_requests"
          active={tableFilter === "material_requests" && !recordIdFilter}
        />
        <FilterPill
          label="템플릿"
          href="/activity-log?table=request_templates"
          active={tableFilter === "request_templates" && !recordIdFilter}
        />
        <FilterPill
          label="사용자"
          href="/activity-log?table=profiles"
          active={tableFilter === "profiles" && !recordIdFilter}
        />
        <FilterPill
          label="입고만"
          href="/activity-log?action=in"
          active={actionFilter === "in" && !tableFilter && !recordIdFilter}
        />
        <FilterPill
          label="출고만"
          href="/activity-log?action=out"
          active={actionFilter === "out" && !tableFilter && !recordIdFilter}
        />
      </div>

      <ActivityLogPagination
        currentPage={page}
        totalPages={totalPages}
        tableFilter={tableFilter}
        actionFilter={actionFilter}
        recordIdFilter={recordIdFilter}
      />

      <ActivityLogTable logs={logs} profileNameMap={profileNameMap} />

      <ActivityLogPagination
        currentPage={page}
        totalPages={totalPages}
        tableFilter={tableFilter}
        actionFilter={actionFilter}
        recordIdFilter={recordIdFilter}
      />
    </div>
  );
}

// 테이블별 record 의 이름 컬럼을 조회 — 없으면 null.
// 일부 리소스는 삭제됐을 수 있으므로 단일 조회 + .maybeSingle() 안전 패턴 사용.
async function resolveRecordLabel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  recordId: string,
): Promise<string | null> {
  try {
    if (table === "products") {
      const { data } = await supabase
        .from("products")
        .select("name")
        .eq("id", recordId)
        .maybeSingle();
      return data?.name ?? null;
    }
    if (table === "sites") {
      const { data } = await supabase
        .from("sites")
        .select("name")
        .eq("id", recordId)
        .maybeSingle();
      return data?.name ?? null;
    }
    if (table === "vendors") {
      const { data } = await supabase
        .from("vendors")
        .select("name")
        .eq("id", recordId)
        .maybeSingle();
      return data?.name ?? null;
    }
    if (table === "purchase_orders") {
      const { data } = await supabase
        .from("purchase_orders")
        .select("po_number")
        .eq("id", recordId)
        .maybeSingle();
      return data?.po_number ?? null;
    }
    if (table === "material_requests") {
      const { data } = await supabase
        .from("material_requests")
        .select("id, sites(name)")
        .eq("id", recordId)
        .maybeSingle();
      const siteName = (data as { sites?: { name?: string } } | null)?.sites
        ?.name;
      return siteName ? `${siteName} 자재신청` : null;
    }
    if (table === "request_templates") {
      const { data } = await supabase
        .from("request_templates")
        .select("name")
        .eq("id", recordId)
        .maybeSingle();
      return data?.name ?? null;
    }
    if (table === "profiles") {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", recordId)
        .maybeSingle();
      return data?.name ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function FilterPill({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
          : "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
      }
    >
      {label}
    </Link>
  );
}
