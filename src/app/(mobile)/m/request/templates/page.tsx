import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TemplateList } from "@/components/mobile/template-list";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
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
  const isAdmin = profile?.role === "admin";

  const { data: templates } = await supabase
    .from("request_templates")
    .select("id, name, note, items, is_public, owner_id, created_by, updated_at")
    .or(`is_public.eq.true,owner_id.eq.${user.id}`)
    .order("is_public", { ascending: false })
    .order("updated_at", { ascending: false });

  const rows = (templates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    note: t.note,
    itemCount: Array.isArray(t.items) ? t.items.length : 0,
    is_public: t.is_public,
    can_delete: (t.owner_id === user.id && !t.is_public) || (isAdmin && t.is_public),
    updated_at: t.updated_at,
  }));

  return (
    <div className="space-y-4">
      <Link
        href="/m/request"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 신청 목록
      </Link>

      <div>
        <h1 className="text-xl font-bold">템플릿 관리</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          자주 쓰는 자재 묶음을 저장해두면 신청 작성 시 한 번에 불러올 수 있습니다.
          {isAdmin && " 관리자는 전체 사용자가 쓸 공용 템플릿을 만들 수 있습니다."}
        </p>
      </div>

      <TemplateList rows={rows} />

      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        새 템플릿은 <b>신청 작성</b> 화면에서 자재를 고른 뒤 "템플릿으로 저장" 버튼으로
        만듭니다.
      </div>
    </div>
  );
}
