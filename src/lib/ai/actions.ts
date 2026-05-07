"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateChatReply,
  generateImageReply,
  type ChatImage,
  type ChatMessage,
  type GroundingSource,
} from "./gemini";
import { getToolsForRole, type ToolContext, type ToolRole } from "./tools";

const MAX_USER_MESSAGE_CHARS = 4000;
// 긴 대화에서 history 누적이 TPM/TPD 한도 초과 유발하는 패턴 발견 (2026-05-07).
// 20 → 10 으로 단축. 컨텍스트 약간 잃지만 토큰 spike 방지가 우선.
const MAX_HISTORY_MESSAGES = 10;
const MAX_IMAGES_PER_MESSAGE = 3;
const MAX_IMAGE_BYTES = 1_500_000; // 1.5MB per image (after client resize)
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// 사용자가 명시적으로 시각화·이미지 생성을 요청한 경우만 트리거.
// 도메인 가드는 IMAGE_SYSTEM_PROMPT 가 추가로 한 번 더 처리.
const IMAGE_TRIGGER_KEYWORDS = [
  "그려줘",
  "그려 줘",
  "그려달라",
  "그려 달라",
  "그림으로",
  "그림 으로",
  "그려보",
  "도식 그",
  "도면 그",
  "결선도 그",
  "회로도 그",
  "구성도 그",
  "배선도 그",
  "이미지 만들",
  "이미지 생성",
  "그림 보여",
  "그림으로 보여",
  "도식화",
  "다이어그램으로",
];

function shouldGenerateImage(text: string): boolean {
  // Phase 6 이미지 생성은 무료 티어 한도 0 으로 비활성 (2026-05-06 확인).
  // 결제 활성화 시 Vercel 환경변수 GEMINI_IMAGE_GENERATION_ENABLED=true 등록만 하면
  // 즉시 동작. 코드 자산은 보존.
  if (process.env.GEMINI_IMAGE_GENERATION_ENABLED !== "true") return false;
  const lower = text.toLowerCase();
  return IMAGE_TRIGGER_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

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
  /** AI 가 생성한 이미지(들). 보통 0~1장. base64. */
  generatedImages: ChatImage[];
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

  // 사용자가 명시적으로 시각화 요청 시 이미지 모델도 병렬 호출.
  // 도메인 가드는 IMAGE_SYSTEM_PROMPT 가 추가로 처리.
  const wantImage = shouldGenerateImage(trimmed);

  // 사내 데이터 함수 호출용 도구·컨텍스트. role 은 quota 응답으로 결정.
  const role: ToolRole = quota.is_admin ? "admin" : "user";
  const tools = getToolsForRole(role);
  const toolContext: ToolContext = {
    supabase,
    userId: user.id,
    userRole: role,
  };
  const chatOptions = { tools, toolContext };

  type TextOk = Awaited<ReturnType<typeof generateChatReply>>;
  type ImageOk = Awaited<ReturnType<typeof generateImageReply>>;
  let textResult: TextOk;
  let imageResult: ImageOk = {
    images: [],
    text: "",
    modelUsed: "",
    inputTokens: null,
    outputTokens: null,
  };
  let imageError: string | null = null;
  try {
    if (wantImage) {
      const [t, i] = await Promise.all([
        generateChatReply(messages, chatOptions),
        generateImageReply(trimmed, images).catch((e) => {
          imageError = e instanceof Error ? e.message : String(e);
          return null;
        }),
      ]);
      textResult = t;
      if (i) imageResult = i;
    } else {
      textResult = await generateChatReply(messages, chatOptions);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: "API_ERROR", message };
  }

  // 텍스트 모델 사용량 기록
  await supabase.rpc("record_gemini_usage", {
    p_model_used: textResult.modelUsed,
    p_fell_back: textResult.fellBack,
    p_prompt_tokens: textResult.inputTokens ?? 0,
    p_response_tokens: textResult.outputTokens ?? 0,
    p_image_generated: false,
  });

  // 이미지 모델 호출이 있었으면 별도 기록 (성공·실패 무관)
  if (wantImage) {
    await supabase.rpc("record_gemini_usage", {
      p_model_used: imageResult.modelUsed || "gemini-2.5-flash-image",
      p_fell_back: false,
      p_prompt_tokens: imageResult.inputTokens ?? 0,
      p_response_tokens: imageResult.outputTokens ?? 0,
      p_image_generated: imageResult.images.length > 0,
    });
  }

  // 이미지 모델 텍스트 응답(캡션 또는 거부 사유)을 본문 끝에 부드럽게 합침
  let composedText = textResult.text;
  if (imageResult.text) {
    composedText = composedText
      ? `${composedText}\n\n---\n\n${imageResult.text}`
      : imageResult.text;
  } else if (wantImage && imageResult.images.length === 0 && imageError) {
    composedText = composedText
      ? `${composedText}\n\n---\n\n이미지 생성에 실패했습니다.`
      : "이미지 생성에 실패했습니다.";
  }

  return {
    ok: true,
    text: composedText,
    modelUsed: textResult.modelUsed,
    fellBack: textResult.fellBack,
    grounded: textResult.grounded,
    sources: textResult.sources,
    generatedImages: imageResult.images,
    userUsed: quota.user_used + 1,
    userLimit: quota.user_limit,
    isAdmin: quota.is_admin,
  };
}
