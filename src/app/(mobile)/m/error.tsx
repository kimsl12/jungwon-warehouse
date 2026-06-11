"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function MobileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-semibold">화면을 불러오지 못했습니다.</p>
        <p className="text-sm text-muted-foreground">
          네트워크 상태를 확인한 뒤 다시 시도해주세요.
          {error.digest && (
            <span className="mt-1 block text-xs">
              오류 코드: {error.digest}
            </span>
          )}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-11 px-6"
        onClick={() => reset()}
      >
        다시 시도
      </Button>
    </div>
  );
}
