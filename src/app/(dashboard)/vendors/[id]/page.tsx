import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RecordActivityPanel } from "@/components/activity-log/record-activity-panel";
import { VendorPricesEditor } from "@/components/vendors/vendor-prices-editor";
import { VendorPricesImport } from "@/components/vendors/vendor-prices-import";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function VendorDetailPage({ params }: { params: Params }) {
  const { id } = await params;

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

  const { data: vendor } = await supabase
    .from("vendors")
    .select(
      "id, name, ceo, contact_person, contact_phone, fax, email, address, business_number, note, active",
    )
    .eq("id", id)
    .single();
  if (!vendor) notFound();

  const { data: prices } = await supabase
    .from("vendor_product_prices")
    .select(
      "id, unit_price, note, products!inner(id, name, variant, unit, category)",
    )
    .eq("vendor_id", id)
    .order("created_at", { ascending: false });

  const priceRows = (prices ?? []).map((p) => ({
    id: p.id,
    unit_price: p.unit_price,
    note: p.note,
    product: p.products
      ? {
          id: p.products.id,
          name: p.products.name,
          variant: p.products.variant,
          unit: p.products.unit,
          category: p.products.category,
        }
      : null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 거래처 목록
        </Link>
      </div>

      {/* Vendor summary */}
      <div className="rounded bg-card p-6 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              거래처
            </p>
            <h2 className="text-2xl font-bold tracking-tight mt-1">{vendor.name}</h2>
            {!vendor.active && (
              <span className="inline-block mt-2 rounded bg-surface-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                비활성
              </span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm pt-2 border-t">
          <InfoRow label="대표자" value={vendor.ceo} />
          <InfoRow label="사업자등록번호" value={vendor.business_number} />
          <InfoRow label="담당자" value={vendor.contact_person} />
          <InfoRow label="담당자 연락처" value={vendor.contact_phone} />
          <InfoRow label="팩스" value={vendor.fax} />
          <InfoRow label="이메일" value={vendor.email} />
          <InfoRow label="주소" value={vendor.address} span2 />
          <InfoRow label="비고" value={vendor.note} span2 />
        </dl>
      </div>

      {/* Prices */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">취급 품목 · 단가</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              발주서 작성 시 이 거래처를 선택하면 아래 단가가 자동으로 채워집니다.
              등록되지 않은 품목은 발주 시 수동으로 단가를 입력할 수 있습니다.
            </p>
          </div>
        </div>
        <VendorPricesImport vendorId={vendor.id} />
        <VendorPricesEditor vendorId={vendor.id} prices={priceRows} />
      </div>

      <RecordActivityPanel
        tableName="vendors"
        recordId={vendor.id}
        title="이 거래처의 활동 내역"
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  span2 = false,
}: {
  label: string;
  value: string | null;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <dt className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value ?? "—"}</dd>
    </div>
  );
}
