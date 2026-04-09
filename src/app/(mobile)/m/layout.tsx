import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";

/**
 * Mobile-mode layout. Auth-gated like the dashboard, but with a stripped-
 * down chrome optimized for one-thumb operation.
 *
 *  - max width 480 (mobile-first)
 *  - sticky header with brand + 데스크톱 모드 switch
 *  - bottom safe-area padding for iOS home bar
 *  - 44px tap targets enforced inside child pages
 */
export default async function MobileLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link href="/m/scan" className="text-base font-semibold">
            정원전기 재고관리
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{profile?.name ?? user.email}</span>
            <Link
              href="/overview"
              className="rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
            >
              데스크톱
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        {children}
      </main>
    </div>
  );
}
