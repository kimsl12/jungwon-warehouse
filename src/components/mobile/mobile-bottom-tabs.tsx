"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  MapPin,
  ClipboardList,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon };

const ADMIN_TABS: Tab[] = [
  { href: "/m/scan", label: "재고", icon: Package },
  { href: "/m/inbound", label: "입고", icon: ArrowDownToLine },
  { href: "/m/outbound", label: "출고", icon: ArrowUpFromLine },
  { href: "/m/sites", label: "현장", icon: MapPin },
];

const USER_TABS: Tab[] = [
  { href: "/m/request", label: "내 신청", icon: ClipboardList },
  { href: "/m/request/new", label: "새 신청", icon: Plus },
];

export function MobileBottomTabs({ role }: { role: "admin" | "user" }) {
  const pathname = usePathname();
  const tabs = role === "user" ? USER_TABS : ADMIN_TABS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card pb-[env(safe-area-inset-bottom)]"
      style={{ boxShadow: "0 -4px 20px rgba(27, 28, 27, 0.06)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/m/request/new" && pathname.startsWith(tab.href + "/"));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-4 min-w-[64px] transition-colors",
                active ? "text-secondary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
