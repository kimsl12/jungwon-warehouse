"use client";

import { Send, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

import { askGemini } from "@/lib/ai/actions";
import {
  clearHistory,
  loadHistory,
  saveHistory,
  type StoredMessage,
} from "@/lib/ai/chat-storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  ChatMessageRow,
  type ChatMessageView,
} from "./chat-message";
import { WelcomeGuide } from "./welcome-guide";

const MAX_INPUT_CHARS = 4000;

type ErrorState =
  | null
  | { kind: "USER_QUOTA_EXCEEDED" }
  | { kind: "GLOBAL_QUOTA_EXCEEDED" }
  | { kind: "MESSAGE_TOO_LONG" }
  | { kind: "API_ERROR"; message: string };

export function ChatPanel({ className }: { className?: string }) {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorState>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMessages(loadHistory());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveHistory(messages);
  }, [messages, hydrated]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  function handlePickExample(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  function handleClear() {
    setMessages([]);
    clearHistory();
    setError(null);
  }

  function send() {
    const trimmed = input.trim();
    if (!trimmed || pending) return;
    if (trimmed.length > MAX_INPUT_CHARS) {
      setError({ kind: "MESSAGE_TOO_LONG" });
      return;
    }
    setError(null);
    const userMsg: StoredMessage = {
      role: "user",
      content: trimmed,
      ts: Date.now(),
    };
    const history = messages;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      const result = await askGemini(
        history.map(({ role, content }) => ({ role, content })),
        trimmed,
      );
      if (!result.ok) {
        if (
          result.error === "USER_QUOTA_EXCEEDED" ||
          result.error === "GLOBAL_QUOTA_EXCEEDED" ||
          result.error === "MESSAGE_TOO_LONG"
        ) {
          setError({ kind: result.error });
        } else if (result.error === "API_ERROR") {
          setError({ kind: "API_ERROR", message: result.message ?? "" });
        } else {
          setError({
            kind: "API_ERROR",
            message: "예상치 못한 오류가 발생했습니다.",
          });
        }
        // Roll back the user message so they can retry without losing input
        setMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
        return;
      }
      const assistantMsg: StoredMessage = {
        role: "assistant",
        content: result.text,
        ts: Date.now(),
        sources: result.sources.length > 0 ? result.sources : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    });
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  const view: ChatMessageView[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
    sources: m.sources,
  }));
  if (pending) view.push({ role: "assistant", content: "", pending: true });

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3"
      >
        {!hydrated ? null : messages.length === 0 ? (
          <WelcomeGuide onPickExample={handlePickExample} />
        ) : (
          <div className="space-y-3">
            {view.map((m, i) => (
              <ChatMessageRow key={i} message={m} />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-danger/30 bg-danger-bg/40 px-4 py-2 text-xs text-danger">
          {error.kind === "USER_QUOTA_EXCEEDED" &&
            "오늘 개인 한도(100회)를 모두 사용했습니다. 내일 다시 시도해주세요."}
          {error.kind === "GLOBAL_QUOTA_EXCEEDED" &&
            "오늘 사내 전체 한도가 소진됐습니다. 내일 다시 시도해주세요."}
          {error.kind === "MESSAGE_TOO_LONG" &&
            `메시지가 너무 깁니다 (최대 ${MAX_INPUT_CHARS.toLocaleString("ko-KR")}자).`}
          {error.kind === "API_ERROR" &&
            `AI 응답에 실패했습니다. ${error.message ? "( " + error.message.slice(0, 80) + " )" : ""}`}
        </div>
      )}

      <div className="border-t border-border bg-card px-3 py-2">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="질문을 입력하세요. (Enter 전송, Shift+Enter 줄바꿈)"
            disabled={pending}
            rows={2}
            className="min-h-[44px] resize-none text-sm"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={pending || input.trim().length === 0}
            aria-label="전송"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Gemini 2.5 Flash</span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              대화 비우기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
