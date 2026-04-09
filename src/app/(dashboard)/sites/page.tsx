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

  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, address, contact, note, active, created_at")
    .order("active", { ascending: false })
    .order("name");

  const activeCount = (sites ?? []).filter((s) => s.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">현장 관리</h2>
          <p className="text-sm text-muted-foreground">
            전체 {(sites ?? []).length.toLocaleString("ko-KR")}곳 · 활성{" "}
            {activeCount.toLocaleString("ko-KR")}곳
          </p>
        </div>
        <SiteCreateDialog />
      </div>

      <div className="rounded-md border bg-muted/20 p-4 text-xs text-muted-foreground">
        💡 출고 처리 시 현장 선택이 <span className="font-semibold">필수</span>입니다. 출고
        내역이 있는 현장은 삭제할 수 없으니, 운영 종료 시{" "}
        <span className="font-semibold">비활성화</span>로 드롭다운에서 숨기세요. 자주 쓰지 않는
        분류 (예: <span className="font-mono">미지정</span>, <span className="font-mono">사내</span>)는
        직접 등록해서 사용하시면 됩니다.
      </div>

      <SitesTable sites={sites ?? []} />
    </div>
  );
}
