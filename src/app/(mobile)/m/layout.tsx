import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { MobileBottomTabs } from "@/components/mobile/mobile-bottom-tabs";
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
      {/* Dark header */}
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground">
        <div className="mx-auto flex h-12 max-w-md items-center justify-between px-4">
          <Link href={homeHref} className="text-sm font-bold tracking-tight">
            정원전기
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-primary-foreground/70">{profile?.name ?? user.email}</span>
            {role === "admin" && (
              <Link
                href="/overview"
                className="rounded bg-white/10 px-2 py-1 text-primary-foreground/80 hover:bg-white/20 transition-colors"
              >
                데스크톱
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 pb-20">
        {children}
      </main>

      {/* Bottom tabs */}
      <MobileBottomTabs role={role} />
    </div>
  );
}
