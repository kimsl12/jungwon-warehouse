import { GoogleGenAI, type Content } from "@google/genai";

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `당신은 대한민국 전기 공사·설비 분야 전문가입니다.

[역할]
- 전기설비기술기준(KEC), KS 표준, 산업안전보건법, 소방시설 관련 규정에 근거해 답변합니다.
- 자재(전선·차단기·배관·조명 등) 선정, 시공 방법, 안전 수칙, 관련 법규를 안내합니다.
- 모호한 질문은 추가 확인이 필요한 항목을 먼저 되묻습니다.

[답변 원칙]
- 한국어로, 간결하되 근거(규정 조항·표준 번호)를 함께 제시합니다.
- 표나 목록이 명확할 때는 마크다운 표·번호 매기기를 사용합니다.
- 확실하지 않은 내용은 "확인이 필요합니다"로 명시하고 추측하지 않습니다.

[금지 사항]
- 사내 자재 재고·발주 내역·직원 정보·거래처 단가 같은 운영 데이터는 입력받지도, 추측하지도 않습니다. 사용자가 그런 정보를 보내면 "민감 정보는 사내 시스템에서 직접 확인해주세요"라고 안내하고 일반 기술 답변만 제공합니다.
- 사람의 생명·안전이 직접 걸린 작업(고압선 활선 작업 등)에는 반드시 자격자에게 의뢰하라고 안내합니다.
`;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

function toContents(messages: ChatMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
}

export type GenerateResult = {
  text: string;
  modelUsed: string;
  fellBack: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
};

function isUnavailable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status === 503 || status === 429) return true;
  const message =
    err instanceof Error ? err.message : String((err as { message?: unknown }).message ?? "");
  return /\b(503|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand)\b/i.test(
    message,
  );
}

async function callModel(model: string, messages: ChatMessage[]) {
  const ai = getClient();
  return ai.models.generateContent({
    model,
    contents: toContents(messages),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.4,
    },
  });
}

export async function generateChatReply(
  messages: ChatMessage[],
): Promise<GenerateResult> {
  let modelUsed = PRIMARY_MODEL;
  let fellBack = false;

  let response;
  try {
    response = await callModel(PRIMARY_MODEL, messages);
  } catch (err) {
    if (!isUnavailable(err)) throw err;
    modelUsed = FALLBACK_MODEL;
    fellBack = true;
    response = await callModel(FALLBACK_MODEL, messages);
  }

  const text = response.text ?? "";
  const usage = response.usageMetadata;
  return {
    text,
    modelUsed,
    fellBack,
    inputTokens: usage?.promptTokenCount ?? null,
    outputTokens: usage?.candidatesTokenCount ?? null,
  };
}

export const GEMINI_PRIMARY_MODEL = PRIMARY_MODEL;
export const GEMINI_FALLBACK_MODEL = FALLBACK_MODEL;
