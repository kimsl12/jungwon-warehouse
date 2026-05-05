import type { ChatMessage, GroundingSource } from "./gemini";

const STORAGE_KEY = "jungwon-ai-chat-history-v1";
const MAX_MESSAGES = 50;

export type StoredMessage = ChatMessage & {
  ts: number;
  sources?: GroundingSource[];
};

export function loadHistory(): StoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is StoredMessage =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        typeof m.ts === "number",
    );
  } catch {
    return [];
  }
}

export function saveHistory(messages: StoredMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // QuotaExceededError 등 — 조용히 실패. 다음 mount 시 빈 히스토리.
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
