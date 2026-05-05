"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateChatReply,
  type ChatImage,
  type ChatMessage,
  type GroundingSource,
} from "./gemini";

const MAX_USER_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_IMAGES_PER_MESSAGE = 3;
const MAX_IMAGE_BYTES = 1_500_000; // 1.5MB per image (after client resize)
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type QuotaResult = {
  allowed: boolean;
  reason: "USER_QUOTA_EXCEEDED" | "GLOBAL_QUOTA_EXCEEDED" | null;
  user_used: number;
  global_used: number;
  is_admin: boolean;
  user_limit: number;
  global_limit: number;
};

export type AskGeminiSuccess = {
  ok: true;
  text: string;
  modelUsed: string;
  fellBack: boolean;
  grounded: boolean;
  sources: GroundingSource[];
  userUsed: number;
  userLimit: number;
  isAdmin: boolean;
};

export type AskGeminiError = {
  ok: false;
  error:
    | "NOT_AUTHENTICATED"
    | "EMPTY_MESSAGE"
    | "MESSAGE_TOO_LONG"
    | "USER_QUOTA_EXCEEDED"
    | "GLOBAL_QUOTA_EXCEEDED"
    | "TOO_MANY_IMAGES"
    | "IMAGE_TOO_LARGE"
    | "INVALID_IMAGE_TYPE"
    | "API_ERROR";
  message?: string;
};

export type AskGeminiResult = AskGeminiSuccess | AskGeminiError;

export async function askGemini(
  history: ChatMessage[],
  userMessage: string,
  images: ChatImage[] = [],
): Promise<AskGeminiResult> {
  const trimmed = userMessage.trim();
  if (trimmed.length === 0 && images.length === 0) {
    return { ok: false, error: "EMPTY_MESSAGE" };
  }
  if (trimmed.length > MAX_USER_MESSAGE_CHARS) {
    return { ok: false, error: "MESSAGE_TOO_LONG" };
  }
  if (images.length > MAX_IMAGES_PER_MESSAGE) {
    return { ok: false, error: "TOO_MANY_IMAGES" };
  }
  for (const img of images) {
    if (!ALLOWED_IMAGE_MIME.has(img.mimeType)) {
      return { ok: false, error: "INVALID_IMAGE_TYPE" };
    }
    // Base64 length × 0.75 ≈ raw byte length
    const approxBytes = Math.floor(img.data.length * 0.75);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return { ok: false, error: "IMAGE_TOO_LARGE" };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "NOT_AUTHENTICATED" };
  }

  const { data: quotaRaw, error: quotaErr } =
    await supabase.rpc("check_gemini_quota");
  if (quotaErr || !quotaRaw) {
    return {
      ok: false,
      error: "API_ERROR",
      message: quotaErr?.message ?? "quota check failed",
    };
  }
  const quota = quotaRaw as unknown as QuotaResult;
  if (!quota.allowed) {
    return {
      ok: false,
      error:
        quota.reason === "USER_QUOTA_EXCEEDED"
          ? "USER_QUOTA_EXCEEDED"
          : "GLOBAL_QUOTA_EXCEEDED",
    };
  }

  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);
  const messages: ChatMessage[] = [
    ...trimmedHistory,
    {
      role: "user",
      content: trimmed,
      images: images.length > 0 ? images : undefined,
    },
  ];

  let result;
  try {
    result = await generateChatReply(messages);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: "API_ERROR", message };
  }

  await supabase.rpc("record_gemini_usage", {
    p_model_used: result.modelUsed,
    p_fell_back: result.fellBack,
    p_prompt_tokens: result.inputTokens ?? 0,
    p_response_tokens: result.outputTokens ?? 0,
  });

  return {
    ok: true,
    text: result.text,
    modelUsed: result.modelUsed,
    fellBack: result.fellBack,
    grounded: result.grounded,
    sources: result.sources,
    userUsed: quota.user_used + 1,
    userLimit: quota.user_limit,
    isAdmin: quota.is_admin,
  };
}
