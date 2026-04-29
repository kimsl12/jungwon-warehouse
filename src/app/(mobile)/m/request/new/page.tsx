import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { MobileRequestForm } from "@/components/mobile/mobile-request-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string }>;

export default async function MobileRequestNewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const fromRequestId = params.from;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 역할 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  // 사용자에게 배정된 현장만. admin은 전체 활성 현장 노출.
  let sites: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("sites")
      .select("id, name")
      .eq("active", true)
      .order("name");
    sites = data ?? [];
  } else {
    const { data } = await supabase
      .from("profile_sites")
      .select("site_id, sites!inner(id, name, active)")
      .eq("profile_id", user.id);
    sites = (data ?? [])
      .filter((r) => r.sites?.active)
      .map((r) => ({ id: r.sites!.id, name: r.sites!.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }

  // 템플릿 목록: 공용 + 본인 개인
  const { data: rawTemplates } = await supabase
    .from("request_templates")
    .select("id, name, note, items, is_public, owner_id, created_by, updated_at")
    .or(`is_public.eq.true,owner_id.eq.${user.id}`)
    .order("is_public", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(50);

  const templates = (rawTemplates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    note: t.note,
    items: t.items as Array<{ product_id: string; requested_quantity: number; note?: string | null }>,
    is_public: t.is_public,
    is_mine: t.owner_id === user.id || t.created_by === user.id,
  }));

  // "복제" 플로우: from 쿼리가 있으면 기존 신청의 라인을 초기값으로
  let initialLines: Array<{
    product_id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    quantity: number;
    note: string;
  }> = [];
  let initialSiteId: string | undefined;
  if (fromRequestId) {
    const { data: cloneSource } = await supabase
      .from("material_requests")
      .select(
        "site_id, material_request_items(product_id, product_name, product_variant, unit, requested_quantity, note, sort_order)",
      )
      .eq("id", fromRequestId)
      .single();
    if (cloneSource) {
      // 배정된 현장만 미리 채움 (admin 또는 배정된 경우)
      if (sites.some((s) => s.id === cloneSource.site_id)) {
        initialSiteId = cloneSource.site_id;
      }
      const items = (cloneSource.material_request_items ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);
      initialLines = items.map((it) => ({
        product_id: it.product_id,
        name: it.product_name,
        variant: it.product_variant,
        unit: it.unit,
        quantity: it.requested_quantity,
        note: it.note ?? "",
      }));
    }
  }

  // 템플릿 내 product 정보 조회 (이름·variant·unit 스냅샷)
  const productIds = Array.from(
    new Set(templates.flatMap((t) => t.items.map((i) => i.product_id))),
  );
  const productMetaMap = new Map<
    string,
    { name: string; variant: string | null; unit: string | null }
  >();
  if (productIds.length > 0) {
    const { data: productRows } = await supabase
      .from("products")
      .select("id, name, variant, unit")
      .in("id", productIds);
    for (const p of productRows ?? []) {
      productMetaMap.set(p.id, { name: p.name, variant: p.variant, unit: p.unit });
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/m/request"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 신청 목록
      </Link>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">새 자재 신청</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            현장을 선택하고 필요한 자재를 추가한 뒤 제출해주세요.
          </p>
        </div>
        <Link
          href="/m/request/templates"
          className="text-[11px] font-medium text-secondary hover:underline"
        >
          템플릿 관리 →
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="text-sm font-medium">배정된 현장이 없습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">
            관리자에게 현장 배정을 요청해주세요.
          </p>
        </div>
      ) : (
        <MobileRequestForm
          sites={sites}
          templates={templates}
          productMetaMap={Object.fromEntries(productMetaMap)}
          initialLines={initialLines}
          initialSiteId={initialSiteId}
        />
      )}
    </div>
  );
}
