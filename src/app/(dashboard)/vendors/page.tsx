import { redirect } from "next/navigation";
import { Building2, CheckCircle, XCircle } from "lucide-react";

import { KPICard } from "@/components/shared/kpi-card";
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalCount.toLocaleString("ko-KR")}곳 관리 중 · 활성{" "}
          {activeCount.toLocaleString("ko-KR")}곳
        </p>
        <VendorCreateDialog />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard
          label="전체 거래처"
          value={totalCount.toLocaleString("ko-KR")}
          icon={Building2}
          iconAccent="brand"
        />
        <KPICard
          label="활성"
          value={activeCount.toLocaleString("ko-KR")}
          icon={CheckCircle}
          iconAccent="success"
        />
        <KPICard
          label="비활성"
          value={(totalCount - activeCount).toLocaleString("ko-KR")}
          icon={XCircle}
          iconAccent="info"
        />
      </div>

      <VendorsTable vendors={vendors ?? []} />
    </div>
  );
}
