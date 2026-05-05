"use server";

import { createClient } from "@/lib/supabase/server";
import { generateChatReply, type ChatMessage } from "./gemini";

const MAX_USER_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 20;

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
    | "API_ERROR";
  message?: string;
};

export type AskGeminiResult = AskGeminiSuccess | AskGeminiError;

export async function askGemini(
  history: ChatMessage[],
  userMessage: string,
): Promise<AskGeminiResult> {
  const trimmed = userMessage.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "EMPTY_MESSAGE" };
  }
  if (trimmed.length > MAX_USER_MESSAGE_CHARS) {
    return { ok: false, error: "MESSAGE_TOO_LONG" };
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
    { role: "user", content: trimmed },
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
    userUsed: quota.user_used + 1,
    userLimit: quota.user_limit,
    isAdmin: quota.is_admin,
  };
}
