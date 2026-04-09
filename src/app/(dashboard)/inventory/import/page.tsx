import Link from "next/link";
import { redirect } from "next/navigation";

import { ImportForm } from "@/components/inventory/import-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function InventoryImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">CSV 가져오기</h2>
        <p className="text-sm text-muted-foreground">
          엑셀에서 작성한 CSV 파일을 업로드해 재고 품목을 일괄 등록할 수 있습니다.
        </p>
      </div>

      {params.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {params.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>CSV 형식 안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">필수 컬럼</p>
            <p className="text-muted-foreground">제품명, 수량, 위치</p>
          </div>
          <div>
            <p className="font-medium">선택 컬럼</p>
            <p className="text-muted-foreground">분류, 단위, 최소수량</p>
          </div>
          <div className="rounded-md bg-muted/40 p-3 font-mono text-xs">
            <p>제품명,분류,단위,수량,최소수량,위치</p>
            <p>전선 1.5SQ,전선,롤,20,5,A-1</p>
            <p>차단기 30A,차단기,개,15,3,B-2</p>
          </div>
          <p className="text-xs text-muted-foreground">
            • 파일은 UTF-8 인코딩으로 저장하세요. 엑셀에서 저장 시{" "}
            <span className="font-medium">CSV UTF-8 (.csv)</span> 형식을 선택합니다.
            <br />• 같은 제품명이 이미 있는 경우, 미리보기에서{" "}
            <span className="font-medium">건너뛰기</span> 또는{" "}
            <span className="font-medium">덮어쓰기</span>를 선택할 수 있습니다.
            <br />• 덮어쓰기 시 수량은 변경되지 않습니다 (입출고 이력 보호).
          </p>
        </CardContent>
      </Card>

      <ImportForm />

      <div>
        <Link
          href="/inventory"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← 재고 페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
}
