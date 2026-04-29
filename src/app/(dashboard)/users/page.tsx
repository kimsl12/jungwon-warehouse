import { redirect } from "next/navigation";

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

  const [usersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, role, title, phone, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("profile_sites").select("profile_id, site_id"),
  ]);

  const users = usersResult.data ?? [];

  // Map<profile_id, site_id[]>
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">사용자 관리</h2>
        <p className="text-sm text-muted-foreground">
          전체 {users.length.toLocaleString("ko-KR")}명 · 관리자{" "}
          {users.filter((u) => u.role === "admin").length}명 · 현장 담당자{" "}
          {users.filter((u) => u.role === "user").length}명
        </p>
      </div>

      <div className="rounded-md border bg-muted/20 p-4 text-xs text-muted-foreground">
        역할을 변경하면 즉시 적용됩니다. <b>관리자(admin)</b>는 재고·입출고·자재 신청 승인/처리
        등 전권을 가집니다. <b>현장 담당자(user)</b>는 배정된 현장의 자재 신청만 가능합니다 —
        현장 배정은 <b>"현장 관리"</b> 페이지에서 각 현장을 수정해 담당자를 선택하세요.
      </div>

      <UsersTable users={usersWithAssignments} currentUserId={user.id} />
    </div>
  );
}
