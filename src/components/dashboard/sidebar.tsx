"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Package,
  Sparkles,
  Users,
  Warehouse,
} from "lucide-react";

import { AIChatSheet } from "@/components/ai-chat/ai-chat-sheet";
import { NotificationToggle } from "@/components/dashboard/notification-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "대시보드", icon: LayoutDashboard },
  { href: "/inventory", label: "재고 관리", icon: Package },
  { href: "/inbound", label: "입고", icon: ArrowDownToLine },
  { href: "/outbound", label: "출고", icon: ArrowUpFromLine },
  { href: "/reports", label: "리포트", icon: BarChart3 },
  { href: "/sites", label: "현장 관리", icon: MapPin, adminOnly: true },
  { href: "/requests", label: "자재 신청", icon: Boxes, adminOnly: true },
  { href: "/purchase-orders", label: "발주서", icon: ClipboardList, adminOnly: true },
  { href: "/vendors", label: "거래처 관리", icon: Building2, adminOnly: true },
  { href: "/users", label: "사용자", icon: Users, adminOnly: true },
  { href: "/activity-log", label: "활동 로그", icon: FileText, adminOnly: true },
  { href: "/ai-usage", label: "AI 사용량", icon: Sparkles, adminOnly: true },
];

export function DashboardSidebar({
  isAdmin,
  userName,
}: {
  isAdmin: boolean;
  userName: string;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside className="sticky top-0 left-0 z-40 hidden h-svh w-[232px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-[18px]">
        <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Warehouse className="size-[18px]" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-[15px] font-semibold tracking-tight">
            정원전기
          </div>
          <div className="text-[11px] text-muted-foreground">재고관리 시스템</div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-2 py-2.5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-0.5 flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-2 py-2">
        <AIChatSheet
          trigger={
            <span className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
              <Sparkles className="size-[18px] shrink-0 text-primary" />
              <span className="flex-1 truncate text-left">AI에게 물어보기</span>
            </span>
          }
        />
        {isAdmin && <NotificationToggle />}
      </div>

      <div className="flex items-center gap-2.5 border-t border-sidebar-border p-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {userName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">{userName}</p>
          <p className="text-[11px] text-muted-foreground">
            {isAdmin ? "관리자" : "사용자"}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
