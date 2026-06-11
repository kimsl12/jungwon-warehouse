import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">불러오는 중…</p>
    </div>
  );
}
