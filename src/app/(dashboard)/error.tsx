"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-semibold">페이지를 불러오지 못했습니다.</p>
        <p className="text-sm text-muted-foreground">
          일시적인 오류일 수 있습니다. 다시 시도해주세요.
          {error.digest && (
            <span className="mt-1 block text-xs">
              오류 코드: {error.digest}
            </span>
          )}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => reset()}>
        다시 시도
      </Button>
    </div>
  );
}
