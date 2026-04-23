import { redirect } from "next/navigation";

import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
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
  if (profile?.role !== "admin") redirect("/inventory");

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, fax, email")
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          매입 관리
        </p>
        <h2 className="text-2xl font-bold tracking-tight mt-1">발주서 작성</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          거래처를 선택하면 해당 거래처의 등록된 품목 단가가 자동으로 채워집니다.
        </p>
      </div>

      <PurchaseOrderForm vendors={vendors ?? []} />
    </div>
  );
}
