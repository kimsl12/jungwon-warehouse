import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { LowStockBanner } from "@/components/dashboard/low-stock-banner";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const userName = profile?.name ?? user.email ?? "";

  return (
    <div className="flex min-h-svh">
      {/* Sidebar — desktop only */}
      <DashboardSidebar isAdmin={isAdmin} userName={userName} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background px-6">
          <div />
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/m/scan"
              className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
            >
              모바일 모드
            </Link>
            <span className="text-on-surface-variant text-sm">
              {userName}
              {isAdmin && (
                <span className="ml-2 rounded bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                  관리자
                </span>
              )}
            </span>
            <LogoutButton />
          </div>
        </header>
        <LowStockBanner />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
