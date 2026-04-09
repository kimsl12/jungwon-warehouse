import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">정원창고 재고관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">사내 재고 관리 시스템</p>
        </div>
        {children}
      </div>
    </div>
  );
}
