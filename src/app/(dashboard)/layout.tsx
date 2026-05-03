import Link from "next/link";
import { redirect } from "next/navigation";
import { Smartphone } from "lucide-react";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { LowStockBanner } from "@/components/dashboard/low-stock-banner";
import { PageTitle } from "@/components/dashboard/page-title";
import { RequestAlertBar } from "@/components/dashboard/request-alert-bar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
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
      <DashboardSidebar isAdmin={isAdmin} userName={userName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-6">
          <PageTitle />
          <Link
            href="/m/scan"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <Smartphone className="size-3.5" />
            모바일 모드
          </Link>
          <LogoutButton />
        </header>
        {isAdmin && <RequestAlertBar />}
        <LowStockBanner />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
