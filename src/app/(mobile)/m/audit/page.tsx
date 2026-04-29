import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { MobileAuditSession } from "@/components/mobile/mobile-audit-session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MobileAuditPage() {
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
  if (profile?.role !== "admin") redirect("/m/request");

  // 최근 실사 기록 최대 10건
  const { data: recent } = await supabase
    .from("stock_audits")
    .select(
      "id, product_id, db_quantity, counted_quantity, difference, resolution, note, created_at, products(name, variant, unit)",
    )
    .order("created_at", { ascending: false })
    .limit(10);

  const recentRows = (recent ?? []).map((r) => ({
    id: r.id,
    productName: r.products?.name ?? "-",
    productVariant: r.products?.variant ?? null,
    unit: r.products?.unit ?? null,
    dbQuantity: r.db_quantity,
    countedQuantity: r.counted_quantity,
    difference: r.difference,
    resolution: r.resolution,
    note: r.note,
    createdAt: r.created_at,
  }));

  return (
    <div className="space-y-4">
      <Link href="/m/scan" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> 재고
      </Link>

      <div>
        <h1 className="text-xl font-bold">재고 실사</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          제품을 검색해 실제 재고 수량을 입력하세요. DB 수량과 차이가 있으면 자동 조정
          또는 수동 검토로 기록합니다.
        </p>
      </div>

      <MobileAuditSession recent={recentRows} />
    </div>
  );
}
