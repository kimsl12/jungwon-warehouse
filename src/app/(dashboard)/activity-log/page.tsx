import Link from "next/link";
import { redirect } from "next/navigation";

import { ActivityLogPagination } from "@/components/activity-log/activity-log-pagination";
import { ActivityLogTable } from "@/components/activity-log/activity-log-table";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  page?: string;
  table?: string;
  action?: string;
}>;

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  // Gate: admin only. The dashboard nav already hides this for non-admins,
  // but the page itself must enforce too — RLS would also block the query,
  // we redirect for a friendlier UX.
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

  let query = supabase
    .from("activity_logs")
    .select("id, action, table_name, record_id, details, user_id, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (tableFilter) query = query.eq("table_name", tableFilter);
  if (actionFilter) query = query.eq("action", actionFilter);

  const logsResult = await query;

  const logs = logsResult.data ?? [];
  const totalCount = logsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Resolve user names for the visible logs (FK points to auth.users)
  const userIds = Array.from(
    new Set(logs.map((l) => l.user_id).filter((id): id is string => Boolean(id))),
  );
  let profileNameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    profileNameMap = new Map((profileRows ?? []).map((p) => [p.id, p.name]));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">활동 로그</h2>
        <p className="text-sm text-muted-foreground">
          전체 {totalCount.toLocaleString("ko-KR")}건 — 모든 데이터 변경 이력은 자동으로
          기록됩니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterPill
          label="전체"
          href="/activity-log"
          active={!tableFilter && !actionFilter}
        />
        <FilterPill
          label="재고 변경"
          href="/activity-log?table=products"
          active={tableFilter === "products"}
        />
        <FilterPill
          label="입출고"
          href="/activity-log?table=transactions"
          active={tableFilter === "transactions"}
        />
        <FilterPill
          label="입고만"
          href="/activity-log?action=in"
          active={actionFilter === "in"}
        />
        <FilterPill
          label="출고만"
          href="/activity-log?action=out"
          active={actionFilter === "out"}
        />
      </div>

      <ActivityLogTable logs={logs} profileNameMap={profileNameMap} />

      <ActivityLogPagination
        currentPage={page}
        totalPages={totalPages}
        tableFilter={tableFilter}
        actionFilter={actionFilter}
      />
    </div>
  );
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
