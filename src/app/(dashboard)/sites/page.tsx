import { redirect } from "next/navigation";

import { SiteCreateDialog } from "@/components/sites/site-create-dialog";
import { SitesTable } from "@/components/sites/sites-table";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
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
    redirect("/inventory");
  }

  const [sitesResult, usersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, address, note, active, created_at")
      .order("active", { ascending: false })
      .order("name"),
    // 현장 담당자 후보 = role='user' 프로필만
    supabase
      .from("profiles")
      .select("id, name, email, title")
      .eq("role", "user")
      .order("name", { ascending: true }),
    supabase.from("profile_sites").select("site_id, profile_id"),
  ]);

  const sites = sitesResult.data ?? [];
  const rawCandidates = usersResult.data ?? [];
  const profileNameMap = new Map(
    rawCandidates.map((p) => [p.id, p.name ?? p.email ?? "—"]),
  );
  const siteNameMap = new Map(sites.map((s) => [s.id, s.name]));

  // Map<site_id, profile_id[]>
  const assigneeIdsBySite = new Map<string, string[]>();
  // Map<profile_id, site_id[]> — 한 담당자가 배정된 모든 현장
  const sitesByProfile = new Map<string, string[]>();
  for (const row of assignmentsResult.data ?? []) {
    const arr = assigneeIdsBySite.get(row.site_id) ?? [];
    arr.push(row.profile_id);
    assigneeIdsBySite.set(row.site_id, arr);

    const sarr = sitesByProfile.get(row.profile_id) ?? [];
    sarr.push(row.site_id);
    sitesByProfile.set(row.profile_id, sarr);
  }

  // 후보 프로필 목록에 현재 배정된 현장명 리스트를 곁들여, picker가 "이미 N곳 담당"
  // 배지를 보여줄 수 있게 함. 한 담당자를 여러 현장에 동시 배정하는 것을 명시적으로 지원.
  const assigneeCandidates = rawCandidates.map((p) => {
    const siteIds = sitesByProfile.get(p.id) ?? [];
    const assignedSiteNames = siteIds
      .map((id) => siteNameMap.get(id))
      .filter((n): n is string => Boolean(n))
      .sort((a, b) => a.localeCompare(b, "ko"));
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      title: p.title,
      assignedSiteNames,
    };
  });

  // 현장별 담당자 이름 리스트 (테이블 표시용) + 담당자 id 리스트 (다이얼로그 초기값)
  const sitesWithAssignees = sites.map((s) => {
    const ids = assigneeIdsBySite.get(s.id) ?? [];
    const filteredIds = ids.filter((id) => profileNameMap.has(id));
    const names = filteredIds
      .map((id) => profileNameMap.get(id)!)
      .sort((a, b) => a.localeCompare(b, "ko"));
    return {
      ...s,
      assigneeIds: filteredIds,
      assigneeNames: names,
    };
  });

  const activeCount = sites.filter((s) => s.active).length;
  const totalCount = sites.length;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            현장 관리
          </p>
          <h2 className="text-2xl font-bold tracking-tight mt-1">현장 목록</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount.toLocaleString("ko-KR")}곳 관리 중 · 활성 {activeCount}곳
          </p>
        </div>
        <SiteCreateDialog assigneeCandidates={assigneeCandidates} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            전체 현장
          </p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums">{totalCount}</p>
        </div>
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            활성
          </p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums text-emerald-600">
            {activeCount}
          </p>
        </div>
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            비활성
          </p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums text-muted-foreground">
            {totalCount - activeCount}
          </p>
        </div>
      </div>

      <SitesTable sites={sitesWithAssignees} assigneeCandidates={assigneeCandidates} />
    </div>
  );
}
