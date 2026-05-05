import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { ChatPanel } from "@/components/ai-chat/chat-panel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MobileAIChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100svh-3.5rem-5rem)] min-h-0 flex-col">
      <header className="border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI에게 물어보기
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          전기·공사 규정과 시공 가이드를 답변합니다.
          <br />
          <span className="text-muted-foreground/80">
            일반 답변 5~7초, 자료 검색이 필요한 답변은 12~25초 소요됩니다.
          </span>
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <ChatPanel />
      </div>
    </div>
  );
}
