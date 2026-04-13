"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  MapPin,
  Users,
  FileText,
  BarChart3,
} from "lucide-react";

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
  { href: "/users", label: "사용자", icon: Users, adminOnly: true },
  { href: "/activity-log", label: "활동 로그", icon: FileText, adminOnly: true },
];

export function DashboardSidebar({
  isAdmin,
  userName,
}: {
  isAdmin: boolean;
  userName: string;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden md:flex h-svh w-60 flex-col sticky top-0 left-0 bg-surface-low z-40">
      <div className="flex flex-col h-full py-6">
        {/* Branding */}
        <div className="px-6 mb-8">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            정원전기
          </h1>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
            재고관리 시스템
          </p>
        </div>

        {/* CTA */}
        <div className="px-4 mb-6">
          <Link
            href="/inventory"
            className="flex w-full items-center justify-center gap-2 rounded bg-gradient-to-b from-primary to-[#1a202c] px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
          >
            <Package className="h-4 w-4" />
            재고 조회
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors relative",
                  active
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-secondary" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto px-3">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {userName}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {isAdmin ? "관리자" : "사용자"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
