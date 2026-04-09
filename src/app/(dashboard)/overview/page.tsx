import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
        <p className="text-sm text-muted-foreground">재고 현황과 입출고 추이를 확인하세요.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>준비 중</CardTitle>
          <CardDescription>대시보드 위젯은 Phase 6에서 구현됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            현재는 인증 흐름만 동작합니다. 다음 단계에서 재고 CRUD, 입출고, 리포트 차트가 추가될
            예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
