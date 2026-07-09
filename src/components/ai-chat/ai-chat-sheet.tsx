"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { ChatPanel } from "./chat-panel";

export function AIChatSheet({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<button type="button" />}>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-md flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI에게 물어보기
          </SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            전기·공사 규정과 시공 가이드를 답변합니다.
            <br />
            <span className="text-muted-foreground/80">
              일반 답변 5~7초, 자료 검색이 필요한 답변은 12~25초 소요됩니다.
            </span>
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1">
          <ChatPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
