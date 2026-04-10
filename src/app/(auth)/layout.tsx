import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-low p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold tracking-tight">정원전기</h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            재고관리 시스템
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
