import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { MobileBottomTabs } from "@/components/mobile/mobile-bottom-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function MobileLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  const role: "admin" | "user" = profile?.role === "admin" ? "admin" : "user";
  const homeHref = role === "user" ? "/m/request" : "/m/scan";

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link
            href={homeHref}
            className="font-display text-[15px] font-semibold tracking-tight"
          >
            정원전기
          </Link>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">
              {profile?.name ?? user.email}
            </span>
            {role === "admin" && (
              <Link
                href="/overview"
                className="rounded-md bg-muted px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/80"
              >
                데스크톱
              </Link>
            )}
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 pb-20">
        {children}
      </main>

      <MobileBottomTabs role={role} />
    </div>
  );
}
