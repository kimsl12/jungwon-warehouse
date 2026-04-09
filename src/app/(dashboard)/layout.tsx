import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { LowStockBanner } from "@/components/dashboard/low-stock-banner";
import { DashboardNav } from "@/components/dashboard/nav";
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

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">정원전기 재고관리</h1>
            </div>
            <DashboardNav isAdmin={isAdmin} />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/m/scan"
              className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              모바일
            </Link>
            <span className="text-muted-foreground">
              {profile?.name ?? user.email}
              {isAdmin && (
                <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  관리자
                </span>
              )}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <LowStockBanner />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
