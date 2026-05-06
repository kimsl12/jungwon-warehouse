"use client";

import { Camera, ImagePlus, Send, Trash2, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { askGemini } from "@/lib/ai/actions";
import {
  clearHistory,
  loadHistory,
  saveHistory,
  type StoredMessage,
} from "@/lib/ai/chat-storage";
import type { ChatImage } from "@/lib/ai/gemini";
import {
  isAcceptableImageType,
  MAX_IMAGES,
  resizeImageToBase64,
} from "@/lib/ai/image-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { ChatMessageRow, type ChatMessageView } from "./chat-message";
import { WelcomeGuide } from "./welcome-guide";

const MAX_INPUT_CHARS = 4000;

type ErrorState =
  | null
  | { kind: "USER_QUOTA_EXCEEDED" }
  | { kind: "GLOBAL_QUOTA_EXCEEDED" }
  | { kind: "MESSAGE_TOO_LONG" }
  | { kind: "TOO_MANY_IMAGES" }
  | { kind: "IMAGE_TOO_LARGE" }
  | { kind: "INVALID_IMAGE_TYPE" }
  | { kind: "API_ERROR"; message: string };

type StagedImage = ChatImage & { previewUrl: string; filename: string };

export function ChatPanel({ className }: { className?: string }) {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorState>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - staged.length;
    if (remaining <= 0) {
      setError({ kind: "TOO_MANY_IMAGES" });
      return;
    }
    setError(null);
    const next: StagedImage[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!isAcceptableImageType(file)) {
        setError({ kind: "INVALID_IMAGE_TYPE" });
        continue;
      }
      try {
        const { mimeType, data } = await resizeImageToBase64(file);
        next.push({
          mimeType,
          data,
          previewUrl: URL.createObjectURL(file),
          filename: file.name,
        });
      } catch (e) {
        setError({
          kind: "API_ERROR",
          message: e instanceof Error ? e.message : "이미지 처리 실패",
        });
      }
    }
    if (next.length > 0) setStaged((prev) => [...prev, ...next]);
  }

  function removeStaged(idx: number) {
    setStaged((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function send() {
    const trimmed = input.trim();
    if ((!trimmed && staged.length === 0) || pending) return;
    if (trimmed.length > MAX_INPUT_CHARS) {
      setError({ kind: "MESSAGE_TOO_LONG" });
      return;
    }
    setError(null);

    const sendImages: ChatImage[] = staged.map((s) => ({
      mimeType: s.mimeType,
      data: s.data,
    }));
    const userMsg: StoredMessage = {
      role: "user",
      content: trimmed,
      ts: Date.now(),
      imagesPreview:
        staged.length > 0
          ? staged.map((s) => ({ url: s.previewUrl, filename: s.filename }))
          : undefined,
    };
    const history = messages;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStaged([]);

    startTransition(async () => {
      const result = await askGemini(
        history.map(({ role, content }) => ({ role, content })),
        trimmed,
        sendImages,
      );
      if (!result.ok) {
        if (
          result.error === "USER_QUOTA_EXCEEDED" ||
          result.error === "GLOBAL_QUOTA_EXCEEDED" ||
          result.error === "MESSAGE_TOO_LONG" ||
          result.error === "TOO_MANY_IMAGES" ||
          result.error === "IMAGE_TOO_LARGE" ||
          result.error === "INVALID_IMAGE_TYPE"
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
        // Roll back so user can retry
        setMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
        // Note: staged 이미지는 Object URL revoke 됐으므로 복원 X.
        // 사용자가 다시 첨부해야 함 — 보안상 단순함이 우선.
        return;
      }
      const generatedUrls =
        result.generatedImages && result.generatedImages.length > 0
          ? result.generatedImages.map(
              (img) => `data:${img.mimeType};base64,${img.data}`,
            )
          : undefined;
      const assistantMsg: StoredMessage = {
        role: "assistant",
        content: result.text,
        ts: Date.now(),
        sources: result.sources.length > 0 ? result.sources : undefined,
        generatedImageUrls: generatedUrls,
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    e.target.value = "";
  }

  const view: ChatMessageView[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
    sources: m.sources,
    imagesPreview: m.imagesPreview,
    generatedImageUrls: m.generatedImageUrls,
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
          {error.kind === "TOO_MANY_IMAGES" &&
            `이미지는 한 번에 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`}
          {error.kind === "IMAGE_TOO_LARGE" &&
            "이미지 용량이 너무 큽니다. 다른 사진으로 시도해주세요."}
          {error.kind === "INVALID_IMAGE_TYPE" &&
            "지원하지 않는 형식입니다. JPEG · PNG · WebP 만 가능합니다."}
          {error.kind === "API_ERROR" &&
            `AI 응답에 실패했습니다. ${error.message ? "( " + error.message.slice(0, 80) + " )" : ""}`}
        </div>
      )}

      {staged.length > 0 && (
        <div className="border-t border-border bg-card px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {staged.map((s, i) => (
              <div
                key={s.previewUrl}
                className="relative size-16 overflow-hidden rounded-md border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.previewUrl}
                  alt={s.filename}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeStaged(i)}
                  className="absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label={`${s.filename} 제거`}
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] text-muted-foreground">
            매장 내부 전체·직원 얼굴·거래처 라벨이 보이는 사진은 자제. 자재나
            설비 부위만 클로즈업 권장.
          </p>
        </div>
      )}

      <div className="border-t border-border bg-card px-3 py-2">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending || staged.length >= MAX_IMAGES}
            aria-label="사진 첨부"
            title="사진 첨부 (최대 3장)"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => cameraInputRef.current?.click()}
            disabled={pending || staged.length >= MAX_IMAGES}
            aria-label="카메라로 촬영"
            title="카메라로 촬영"
            className="md:hidden"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="질문을 입력하세요. (Enter 전송, Shift+Enter 줄바꿈)"
            disabled={pending}
            rows={2}
            className="min-h-[44px] resize-none text-[15px] md:text-sm"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={
              pending || (input.trim().length === 0 && staged.length === 0)
            }
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
