import { redirect } from "next/navigation";

import { VendorCreateDialog } from "@/components/vendors/vendor-create-dialog";
import { VendorsTable } from "@/components/vendors/vendors-table";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
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

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, ceo, contact_person, contact_phone, fax, email, address, business_number, note, active, created_at")
    .order("active", { ascending: false })
    .order("name");

  const activeCount = (vendors ?? []).filter((v) => v.active).length;
  const totalCount = (vendors ?? []).length;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            거래처 관리
          </p>
          <h2 className="text-2xl font-bold tracking-tight mt-1">거래처 목록</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount.toLocaleString("ko-KR")}곳 관리 중 · 활성 {activeCount}곳
          </p>
        </div>
        <VendorCreateDialog />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">전체 거래처</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums">{totalCount}</p>
        </div>
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">활성</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums text-emerald-600">{activeCount}</p>
        </div>
        <div className="rounded bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">비활성</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums text-muted-foreground">
            {totalCount - activeCount}
          </p>
        </div>
      </div>

      <VendorsTable vendors={vendors ?? []} />
    </div>
  );
}
