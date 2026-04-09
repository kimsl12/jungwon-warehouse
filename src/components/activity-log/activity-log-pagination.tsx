import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActivityLogPagination({
  currentPage,
  totalPages,
  tableFilter,
  actionFilter,
}: {
  currentPage: number;
  totalPages: number;
  tableFilter: string;
  actionFilter: string;
}) {
  if (totalPages <= 1) return null;

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (tableFilter) params.set("table", tableFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/activity-log?${qs}` : "/activity-log";
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-muted-foreground">
        {currentPage} / {totalPages} 페이지
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={buildHref(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage === 1}
          tabIndex={currentPage === 1 ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            currentPage === 1 && "pointer-events-none opacity-50",
          )}
        >
          이전
        </Link>
        <Link
          href={buildHref(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage === totalPages}
          tabIndex={currentPage === totalPages ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            currentPage === totalPages && "pointer-events-none opacity-50",
          )}
        >
          다음
        </Link>
      </div>
    </div>
  );
}
