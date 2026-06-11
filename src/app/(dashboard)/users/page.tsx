import { redirect } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilesActivityLog } from "@/components/users/profiles-activity-log";
import { UsersTable } from "@/components/users/users-table";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
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

  const [usersResult, assignmentsResult, logsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, role, title, phone, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("profile_sites").select("profile_id, site_id"),
    supabase
      .from("activity_logs")
      .select("id, user_id, action, record_id, details, created_at")
      .eq("table_name", "profiles")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const users = usersResult.data ?? [];

  const assignmentsByUser = new Map<string, string[]>();
  for (const row of assignmentsResult.data ?? []) {
    const list = assignmentsByUser.get(row.profile_id) ?? [];
    list.push(row.site_id);
    assignmentsByUser.set(row.profile_id, list);
  }

  const usersWithAssignments = users.map((u) => ({
    ...u,
    assignedSiteIds: assignmentsByUser.get(u.id) ?? [],
  }));

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;

  const profileNameMap = new Map<string, string>(
    users.map((u) => [u.id, u.name ?? u.email ?? "—"]),
  );

  const logs = logsResult.data ?? [];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        전체 {users.length.toLocaleString("ko-KR")}명 · 관리자 {adminCount}명 ·
        현장 담당자 {userCount}명
      </p>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">직원 목록</TabsTrigger>
          <TabsTrigger value="logs">변경 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
            역할을 변경하면 즉시 적용됩니다.{" "}
            <b className="text-foreground">관리자(admin)</b>는 재고·입출고·자재
            신청 승인/처리 등 전권을 가집니다.{" "}
            <b className="text-foreground">현장 담당자(user)</b>는 배정된 현장의
            자재 신청만 가능합니다 — 현장 배정은{" "}
            <b className="text-foreground">“현장 관리”</b> 페이지에서 각 현장을
            수정해 담당자를 선택하세요.
          </div>
          <UsersTable users={usersWithAssignments} currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <ProfilesActivityLog logs={logs} profileMap={profileNameMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
