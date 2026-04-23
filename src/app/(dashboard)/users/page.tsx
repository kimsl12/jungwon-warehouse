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

  const { data: users } = await supabase
    .from("profiles")
    .select("id, name, email, role, title, phone, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">사용자 관리</h2>
        <p className="text-sm text-muted-foreground">
          전체 {(users ?? []).length.toLocaleString("ko-KR")}명 · 관리자{" "}
          {(users ?? []).filter((u) => u.role === "admin").length}명
        </p>
      </div>

      <div className="rounded-md border bg-muted/20 p-4 text-xs text-muted-foreground">
        역할을 변경하면 즉시 적용됩니다. 관리자(admin)는 품목 등록/수정/삭제, 현장 관리, CSV
        가져오기, 활동 로그, 사용자 관리에 접근할 수 있습니다. 일반 사용자(user)는 조회 및
        입출고 처리만 가능합니다.
      </div>

      <UsersTable users={users ?? []} currentUserId={user.id} />
    </div>
  );
}
