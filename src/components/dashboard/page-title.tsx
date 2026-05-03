"use client";

import { usePathname } from "next/navigation";

const PAGE_LABELS: Array<{ pattern: string; title: string; subtitle?: string }> = [
  { pattern: "/overview", title: "대시보드", subtitle: "오늘의 재고 · 입출고 요약" },
  { pattern: "/inventory", title: "재고 관리" },
  { pattern: "/transactions", title: "입출고 내역" },
  { pattern: "/sites", title: "현장 관리" },
  { pattern: "/requests/templates", title: "자재 신청 템플릿" },
  { pattern: "/requests", title: "자재 신청" },
  { pattern: "/purchase-orders", title: "발주서" },
  { pattern: "/vendors", title: "거래처 관리" },
  { pattern: "/reports", title: "리포트" },
  { pattern: "/users", title: "사용자" },
  { pattern: "/activity-log", title: "활동 로그" },
];

export function PageTitle() {
  const pathname = usePathname();
  const matched = [...PAGE_LABELS]
    .sort((a, b) => b.pattern.length - a.pattern.length)
    .find(
      (entry) =>
        pathname === entry.pattern || pathname.startsWith(entry.pattern + "/"),
    );

  if (!matched) {
    return <div className="min-w-0 flex-1" />;
  }

  return (
    <div className="min-w-0 flex-1">
      <h1 className="truncate font-display text-[19px] font-semibold tracking-tight text-foreground">
        {matched.title}
      </h1>
      {matched.subtitle && (
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {matched.subtitle}
        </p>
      )}
    </div>
  );
}
