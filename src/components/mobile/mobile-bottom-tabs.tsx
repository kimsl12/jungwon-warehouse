"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  HardHat,
  Package,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon };

const ADMIN_TABS: Tab[] = [
  { href: "/m/scan", label: "재고", icon: Package },
  { href: "/m/inbound", label: "입고", icon: ArrowDownToLine },
  { href: "/m/outbound", label: "출고", icon: ArrowUpFromLine },
  { href: "/m/sites", label: "현장", icon: HardHat },
];

const USER_TABS: Tab[] = [
  { href: "/m/request", label: "내 신청", icon: ClipboardList },
  { href: "/m/request/new", label: "새 신청", icon: Plus },
];

export function MobileBottomTabs({ role }: { role: "admin" | "user" }) {
  const pathname = usePathname();
  const tabs = role === "user" ? USER_TABS : ADMIN_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/m/request/new" &&
              pathname.startsWith(tab.href + "/"));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 px-4 pb-2 pt-2.5 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span
                className={cn(
                  "text-[10.5px]",
                  active ? "font-semibold" : "font-medium",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
