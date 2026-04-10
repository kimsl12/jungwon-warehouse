"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ArrowDownToLine, ArrowUpFromLine, MapPin, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/m/scan", label: "재고", icon: Package },
  { href: "/m/inbound", label: "입고", icon: ArrowDownToLine },
  { href: "/m/outbound", label: "출고", icon: ArrowUpFromLine },
  { href: "/m/sites", label: "현장", icon: MapPin },
];

export function MobileBottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card pb-[env(safe-area-inset-bottom)]"
      style={{ boxShadow: "0 -4px 20px rgba(27, 28, 27, 0.06)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-4 min-w-[64px] transition-colors",
                active
                  ? "text-secondary"
                  : "text-muted-foreground",
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
