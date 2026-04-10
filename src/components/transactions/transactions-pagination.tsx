"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function TransactionsPagination({
  currentPage,
  totalPages,
  basePath = "/transactions",
}: {
  currentPage: number;
  totalPages: number;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function go(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {currentPage} / {totalPages} 페이지
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage <= 1}
          onClick={() => go(currentPage - 1)}
          className="rounded bg-surface-low px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-high disabled:opacity-40 transition-colors"
        >
          이전
        </button>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => go(currentPage + 1)}
          className="rounded bg-surface-low px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-high disabled:opacity-40 transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  );
}
