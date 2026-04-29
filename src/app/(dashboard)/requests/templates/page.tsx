import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TemplateCreateDialog } from "@/components/requests/template-create-dialog";
import { TemplateTable } from "@/components/requests/template-table";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TemplateItem = {
  product_id: string;
  requested_quantity: number;
  note?: string | null;
};

export default async function RequestTemplatesPage() {
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

  const { data: templates } = await supabase
    .from("request_templates")
    .select(
      "id, name, note, items, is_public, owner_id, created_by, updated_at",
    )
    .or(`is_public.eq.true,owner_id.eq.${user.id}`)
    .order("is_public", { ascending: false })
    .order("updated_at", { ascending: false });

  const creatorIds = Array.from(
    new Set((templates ?? []).map((t) => t.created_by).filter(Boolean)),
  ) as string[];
  const creatorsQuery = creatorIds.length
    ? await supabase.from("profiles").select("id, name").in("id", creatorIds)
    : { data: [] as Array<{ id: string; name: string | null }> };
  const creatorMap = new Map(
    (creatorsQuery.data ?? []).map((c) => [c.id, c.name ?? "—"]),
  );

  const productIds = Array.from(
    new Set(
      (templates ?? []).flatMap((t) => {
        const items = Array.isArray(t.items) ? (t.items as TemplateItem[]) : [];
        return items.map((it) => it.product_id);
      }),
    ),
  );
  const productsQuery = productIds.length
    ? await supabase
        .from("products")
        .select("id, name, variant, unit")
        .in("id", productIds)
    : {
        data: [] as Array<{
          id: string;
          name: string;
          variant: string | null;
          unit: string | null;
        }>,
      };
  const productMap = new Map(
    (productsQuery.data ?? []).map((p) => [
      p.id,
      { name: p.name, variant: p.variant, unit: p.unit },
    ]),
  );

  const rows = (templates ?? []).map((t) => {
    const items = Array.isArray(t.items) ? (t.items as TemplateItem[]) : [];
    return {
      id: t.id,
      name: t.name,
      note: t.note,
      is_public: t.is_public,
      created_by_name: creatorMap.get(t.created_by ?? "") ?? "—",
      // 개인 템플릿은 소유자, 공용 템플릿은 admin 누구든 삭제 가능
      can_delete: t.is_public ? true : t.owner_id === user.id,
      updated_at: t.updated_at,
      items: items.map((it) => {
        const p = productMap.get(it.product_id);
        return {
          product_id: it.product_id,
          name: p?.name ?? "(삭제된 자재)",
          variant: p?.variant ?? null,
          unit: p?.unit ?? null,
          requested_quantity: it.requested_quantity,
        };
      }),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/requests"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 자재 신청
          </Link>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            매출 관리
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            자재 신청 템플릿 관리
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            공용 템플릿은 전체 현장 담당자가, 개인 템플릿은 본인만 사용할 수 있습니다.
          </p>
        </div>
        <TemplateCreateDialog />
      </div>
      <TemplateTable rows={rows} />
    </div>
  );
}
