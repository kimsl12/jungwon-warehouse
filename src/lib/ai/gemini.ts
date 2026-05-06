import { GoogleGenAI, type Content } from "@google/genai";
import {
  getToolByName,
  type ChatTool,
  type ToolCallSummary,
  type ToolContext,
  type ToolRole,
} from "./tools";

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const IMAGE_MODEL = "gemini-2.5-flash-image";

/** function call 무한 루프 방지. 5회 안에 답변 못 만들면 강제 종료. */
const MAX_TOOL_ITERATIONS = 5;

const IMAGE_SYSTEM_PROMPT = `당신은 정원전기 사내 챗봇의 이미지 생성 보조 모델입니다. 사용자 요청을 받아 단순한 참고용 일러스트를 생성합니다.

[허용 주제 — 정원전기 업무에 직결되는 시각 자료만]
- 전기 회로도, 결선도, 분전반 구조도, 배선도
- 자재 일러스트 (전선·차단기·등기구·소방 감지기·CCTV·통신선·접지 등)
- 시공 절차 일러스트 (배선·접지·천장·매립 작업 등)
- KEC·KS·소방시설법·정보통신공사업법 관련 시각화

[금지 주제 — 다음 요청에는 이미지를 생성하지 말고 짧은 한국어 텍스트로 거부 사유 안내]
- 사람 얼굴·신체·인종 식별 가능한 이미지
- 동물·풍경·예술·음식·로고·캐릭터·브랜드 이미지
- 정원전기 사내 자재 재고·발주·직원·거래처 관련
- 무기·폭력·성적·정치 콘텐츠
- 백화점 매장 외관·인테리어 디자인·명품 브랜드 로고
- 위 [허용 주제] 와 무관한 일반 이미지 (예: 풍경, 인물, 음식, 풍자 그림)

[스타일]
- 단순 다이어그램 / 기술 일러스트 스타일. CAD 정밀 도면 흉내 X.
- 깔끔한 선 + 흰색 또는 연한 배경.
- 영어 라벨 권장 (한글 라벨은 폰트 깨짐 잦음).
- 가로 비율 16:9 또는 4:3 (모바일 가독성).

[응답 형식]
- 이미지 1장만 생성 (다중 이미지 X).
- 별도 텍스트 설명은 1~2줄로 짧게.
- 결과는 참고용 일러스트임을 명시.
`;

const SYSTEM_PROMPT_BODY = `당신은 정원전기(일반 전기·소방시설공사업 면허, 정보통신공사업 면허 미보유, 백화점 명품 매장 인테리어 서브콘) 사내 직원에게 답하는 전기·소방·통신 전문가입니다.

[회사 환경 자동 반영 금지]
사용자가 "우리 회사", "백화점", "야간", "통신 면허" 같이 명시적으로 묻지 않으면 일반 기술·규정 답변만. "백화점 매장에서는~", "야간 공사 특성~" 같은 자동 부연 금지.

[답변 원칙]
- 단정: "30A 입니다" — 회피·추측 표현 금지.
- 근거 박기: KEC·KS·소방시설법 등 조항 번호 인용. 예) "KEC 232.5.2", "KS C 3328", "소방시설법 §17".
- 모를 때만 솔직히. 추측·창작 금지.
- 모호하면 부족 정보(전압·부하·길이·조건) 먼저 되묻기.
- 짧으면 3~5줄, 복잡하면 섹션. 모바일 사용자 많음.

[반복 응답 방지]
같은 주제 재질문 또는 "다시", "다른 방식", "쉽게" 같은 재요청이면 이전 답변과 다른 형식·관점으로. 같은 정보 두 번 노출 금지.

[표·시각화]
- 마크다운 표 3컬럼 이내. 셀 안 줄바꿈(\`<br>\`) 금지. 4컬럼+ 는 항목별 리스트.
- 텍스트 모델이라 그림·도면 못 그림. ASCII 박스(─│┌) 금지(화면비 깨짐). 단순 정렬만 코드 블록 사용.
- 진짜 도면 필요하면 한계 안내.
- 수치는 백틱: \`30A\`. 핵심 결론은 굵게.

[수치·단위]
KEC 단위: ㎟·A·V·Hz·Ω·℃. 공백 없이: \`30A\`. 천 단위 콤마: \`1,000\`.

[약어]
처음은 정식명+약어, 두 번째부터 약어만. 예) 한국전기설비규정(KEC), 누전차단기(ELB).

[금지]
- 사내 재고·발주·직원·거래처 정보 추측 금지 ("사내 시스템에서 확인" 안내).
- 자격자 영역(활선·고압·소방 점검) "직접 하라" 권유 금지. 자격+차단·검전·접지 절차 같이 안내.
- 부동산·세무·노무·법률 답변 거부.

[이미지 입력]
잘: 자재·분전반·라벨. 부분: 도면(한국 양식 인식 한계, 핵심 수치 되묻기) / 시공(정밀 검사는 자격자). 흐릿하면 재촬영 또는 라벨 직접 입력 안내.
`;

function buildSystemPrompt(opts: {
  role?: ToolRole;
  toolNames?: string[];
} = {}): string {
  const today = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const base = `[현재 시점] 오늘은 ${today}입니다. 시행 시점이 오늘 이전이면 "시행 중"으로, 오늘 이후면 "예정"으로 정확히 구분해서 표기하세요.

${SYSTEM_PROMPT_BODY}`;

  if (!opts.role || !opts.toolNames || opts.toolNames.length === 0) {
    return base;
  }

  const permission = `

[권한·함수]
권한: ${opts.role}. 가능 함수: ${opts.toolNames.join(", ")}.

[함수 호출]
- 사내 데이터 질문(재고·거래처·현장·발주·입출고·요청·사용자·로그)은 반드시 함수 호출. 추측 금지.
- 페이지 이동: navigate_to → 받은 \`path\` 를 \`[페이지명 →](경로)\` 마크다운 링크로. 모바일이면 \`mobile_path\` 우선.
- 결과는 마크다운 표(3컬럼 이내) 또는 목록. 셀 안 줄바꿈 금지.
- 변경 작업(등록·수정·삭제·승인·출고·조정·발송) 절대 수행 금지. 페이지 안내만.
- 권한 외 함수 호출 금지.

[수치 환각 금지 · 매우 중요]
- 함수 결과에 명시된 수치만 사용. 없는 수치(합계·개수·금액·일자) 추측·합성·창작 금지.
- 여러 행은 모두 표/목록으로. 임의 단일 수치 압축 금지.
- 합계는 각 행을 명시적으로 더하는 식: "16mm 129 + 22mm 254 = 383".
- 사용자가 수치 의문 제기하면 함수 재호출로 검증. 자기 답변 인용 금지.
- 결과가 다르면 "이전 답변이 부정확했습니다" 솔직히 정정.
- 0건 답변 후 같은 자재에 다른 수치 제시 금지.

[검색 0건 재시도 — search_inventory / find_recent_transactions 한정, 최대 2회]
변형 순서: a) 합성어 띄어쓰기 추가 ("와이어커넥터" → "와이어 커넥터"), b) 띄어쓰기 제거, c) 핵심어 단독 ("와이어커넥터" → "커넥터"). 영문↔한글 변환 금지. 매칭 시 변형 키워드를 답변에 표시. 2회 재시도 후에도 0건이면 솔직히.`;

  return base + permission;
}

export type ChatImage = {
  mimeType: string;
  /** Base64-encoded raw bytes (no data: URL prefix). */
  data: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  images?: ChatImage[];
};

export type GroundingSource = {
  uri: string;
  title: string;
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
  return messages.map((m) => {
    const parts: NonNullable<Content["parts"]> = [];
    if (m.images && m.images.length > 0) {
      for (const img of m.images) {
        parts.push({
          inlineData: { mimeType: img.mimeType, data: img.data },
        });
      }
    }
    if (m.content || parts.length === 0) {
      parts.push({ text: m.content });
    }
    return {
      role: m.role === "user" ? "user" : "model",
      parts,
    };
  });
}

export type GenerateResult = {
  text: string;
  modelUsed: string;
  fellBack: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
  sources: GroundingSource[];
  grounded: boolean;
  toolCalls: ToolCallSummary[];
};

export type GenerateChatOptions = {
  tools?: ChatTool[];
  toolContext?: ToolContext;
};

function isUnavailable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status === 503 || status === 429) return true;
  const message =
    err instanceof Error
      ? err.message
      : String((err as { message?: unknown }).message ?? "");
  return /\b(503|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand)\b/i.test(
    message,
  );
}

type CallModelOptions = {
  /** function calling 활성화 시 함수 선언 등록 */
  tools?: ChatTool[];
  /** 시스템 프롬프트 권한 섹션 주입용 */
  role?: ToolRole;
  /**
   * function calling 과 googleSearch 는 한 번의 호출에서 동시 사용이 불안정합니다.
   * 사내 데이터 함수 호출 후 마지막 자연어 답변에서는 grounding 을 켜고,
   * 함수 호출 단계에서는 끕니다.
   */
  enableGoogleSearch?: boolean;
};

async function callModel(
  model: string,
  contents: Content[],
  options: CallModelOptions = {},
) {
  const ai = getClient();
  const sdkTools: Array<Record<string, unknown>> = [];
  if (options.tools && options.tools.length > 0) {
    sdkTools.push({
      functionDeclarations: options.tools.map((t) => t.declaration),
    });
  } else if (options.enableGoogleSearch !== false) {
    // 함수 도구 없을 때만 grounding 사용 — 충돌 회피.
    sdkTools.push({ googleSearch: {} });
  }
  return ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: buildSystemPrompt({
        role: options.role,
        toolNames: options.tools?.map((t) => t.declaration.name ?? "") ?? [],
      }),
      temperature: 0.4,
      tools: sdkTools.length > 0 ? sdkTools : undefined,
      // Thinking 자체는 사용 (답변 품질에 도움) 하되, 응답 텍스트에는 미포함.
      // 모델이 "tool_code print(...)" "thought The user..." 같은 사고 과정을
      // 텍스트로 흘리는 케이스 방지.
      thinkingConfig: {
        includeThoughts: false,
      },
    },
  });
}

// thinking trace 가 part 로 섞여 들어오는 케이스 안전망. SDK 가 처리하지 못한
// 경우 직접 필터링.
function extractAnswerText(response: GenContentResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const texts: string[] = [];
  for (const part of parts) {
    const p = part as { thought?: boolean; text?: string };
    if (p.thought) continue;
    if (typeof p.text === "string" && p.text.length > 0) texts.push(p.text);
  }
  let text = texts.length > 0 ? texts.join("") : (response.text ?? "");

  // 마지막 안전망: tool_code 블록 + thought 블록이 텍스트에 들어왔을 때 제거.
  // (실제 답변 시작 전에 한정 — 답변 본문 도중의 단어는 건드리지 않음)
  text = text.replace(
    /^[\s\S]*?(?:tool_code\s+print\([^)]*\)|thought\s+The user[^\n]*)[\s\S]*?\n\n/m,
    "",
  );
  text = text.replace(/^\s*Here's a plan:[\s\S]*?\n\n/m, "");

  // <br> HTML 태그를 평문 구분자로 치환. react-markdown 은 raw HTML 렌더링
  // 안 하므로 그냥 두면 "<br>" 가 그대로 보인다. 시스템 프롬프트에서 금지했지만
  // 모델이 표 셀 안에서 가끔 사용 — 안전망으로 인라인 가운뎃점(·)으로 치환.
  text = text.replace(/<br\s*\/?>/gi, " · ");

  return text.trim();
}

type GenContentResponse = Awaited<ReturnType<typeof callModel>>;

function extractSources(response: GenContentResponse): GroundingSource[] {
  const meta = response.candidates?.[0]?.groundingMetadata;
  if (!meta?.groundingChunks) return [];
  const sources: GroundingSource[] = [];
  for (const chunk of meta.groundingChunks) {
    const web = chunk.web;
    if (!web?.uri) continue;
    sources.push({ uri: web.uri, title: web.title ?? web.uri });
  }
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.uri)) return false;
    seen.add(s.uri);
    return true;
  });
}

type CallResult = Awaited<ReturnType<typeof callModel>>;

async function callWithFallback(
  contents: Content[],
  options: CallModelOptions,
): Promise<{ response: CallResult; modelUsed: string; fellBack: boolean }> {
  try {
    const response = await callModel(PRIMARY_MODEL, contents, options);
    return { response, modelUsed: PRIMARY_MODEL, fellBack: false };
  } catch (err) {
    if (!isUnavailable(err)) throw err;
    const response = await callModel(FALLBACK_MODEL, contents, options);
    return { response, modelUsed: FALLBACK_MODEL, fellBack: true };
  }
}

type FunctionCallPart = {
  functionCall?: { name?: string; args?: Record<string, unknown> };
};

function extractFunctionCalls(
  response: GenContentResponse,
): Array<{ name: string; args: Record<string, unknown> }> {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  for (const raw of parts) {
    const part = raw as FunctionCallPart;
    if (part.functionCall?.name) {
      calls.push({
        name: part.functionCall.name,
        args: part.functionCall.args ?? {},
      });
    }
  }
  return calls;
}

export async function generateChatReply(
  messages: ChatMessage[],
  options: GenerateChatOptions = {},
): Promise<GenerateResult> {
  const tools = options.tools ?? [];
  const ctx = options.toolContext;
  const role = ctx?.userRole;

  // function calling 활성 — 도구가 있고 ctx 가 있을 때만.
  const useTools = tools.length > 0 && !!ctx;

  const contents: Content[] = toContents(messages);
  const toolCalls: ToolCallSummary[] = [];
  let aggregatedModelUsed = PRIMARY_MODEL;
  let aggregatedFellBack = false;
  let lastResponse: CallResult | null = null;

  if (useTools) {
    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const { response, modelUsed, fellBack } = await callWithFallback(
        contents,
        { tools, role, enableGoogleSearch: false },
      );
      aggregatedModelUsed = modelUsed;
      aggregatedFellBack = aggregatedFellBack || fellBack;
      lastResponse = response;

      const calls = extractFunctionCalls(response);
      if (calls.length === 0) break;

      // 모델 응답을 대화에 추가
      const modelParts = response.candidates?.[0]?.content?.parts;
      if (modelParts && modelParts.length > 0) {
        contents.push({ role: "model", parts: modelParts });
      }

      // 함수 실행 + 결과 수집
      const toolResponseParts: Content["parts"] = [];
      for (const call of calls) {
        const tool = getToolByName(call.name);
        if (!tool || !tool.roles.includes(role!)) {
          toolResponseParts!.push({
            functionResponse: {
              name: call.name,
              response: { error: "권한 없음 또는 미등록 함수" },
            },
          });
          toolCalls.push({ name: call.name, args: call.args, ok: false });
          continue;
        }
        try {
          const result = await tool.execute(call.args, ctx!);
          toolResponseParts!.push({
            functionResponse: {
              name: call.name,
              response: (result ?? {}) as Record<string, unknown>,
            },
          });
          toolCalls.push({ name: call.name, args: call.args, ok: true });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          toolResponseParts!.push({
            functionResponse: {
              name: call.name,
              response: { error: message },
            },
          });
          toolCalls.push({ name: call.name, args: call.args, ok: false });
        }
      }
      contents.push({ role: "user", parts: toolResponseParts });
    }

    // 루프 끝났는데 마지막 응답이 여전히 functionCall 만 들어있으면
    // 강제로 텍스트 답변 한 번 더 — tools 없이.
    if (lastResponse && extractFunctionCalls(lastResponse).length > 0) {
      const forced = await callWithFallback(contents, {
        tools: undefined,
        role,
        enableGoogleSearch: false,
      });
      aggregatedModelUsed = forced.modelUsed;
      aggregatedFellBack = aggregatedFellBack || forced.fellBack;
      lastResponse = forced.response;
    }
  } else {
    const { response, modelUsed, fellBack } = await callWithFallback(contents, {
      enableGoogleSearch: true,
    });
    aggregatedModelUsed = modelUsed;
    aggregatedFellBack = fellBack;
    lastResponse = response;
  }

  const finalResponse = lastResponse!;
  const text = extractAnswerText(finalResponse);
  const usage = finalResponse.usageMetadata;
  const sources = extractSources(finalResponse);
  return {
    text,
    modelUsed: aggregatedModelUsed,
    fellBack: aggregatedFellBack,
    inputTokens: usage?.promptTokenCount ?? null,
    outputTokens: usage?.candidatesTokenCount ?? null,
    sources,
    grounded: sources.length > 0,
    toolCalls,
  };
}

export const GEMINI_PRIMARY_MODEL = PRIMARY_MODEL;
export const GEMINI_FALLBACK_MODEL = FALLBACK_MODEL;
export const GEMINI_IMAGE_MODEL = IMAGE_MODEL;

// =====================================================
// 이미지 생성 (Phase 6 — Nano Banana)
// =====================================================

export type GenerateImageResult = {
  /** 모델이 생성한 이미지 (보통 0~1장). */
  images: ChatImage[];
  /** 생성 결과에 동봉된 짧은 텍스트 (참고용 캡션 또는 거부 사유). */
  text: string;
  modelUsed: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export async function generateImageReply(
  userPrompt: string,
  attachedImages: ChatImage[] = [],
): Promise<GenerateImageResult> {
  const ai = getClient();
  const parts: NonNullable<Content["parts"]> = [];
  for (const img of attachedImages) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }
  parts.push({ text: userPrompt });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: IMAGE_SYSTEM_PROMPT,
      // Nano Banana 는 이미지 응답 + 텍스트 동봉 가능
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts ?? [];
  const images: ChatImage[] = [];
  const textChunks: string[] = [];
  for (const part of responseParts) {
    const p = part as {
      inlineData?: { mimeType?: string; data?: string };
      text?: string;
      thought?: boolean;
    };
    if (p.thought) continue;
    if (p.inlineData?.data) {
      images.push({
        mimeType: p.inlineData.mimeType ?? "image/png",
        data: p.inlineData.data,
      });
    }
    if (typeof p.text === "string" && p.text.length > 0) {
      textChunks.push(p.text);
    }
  }

  const usage = response.usageMetadata;
  return {
    images,
    text: textChunks.join("").trim(),
    modelUsed: IMAGE_MODEL,
    inputTokens: usage?.promptTokenCount ?? null,
    outputTokens: usage?.candidatesTokenCount ?? null,
  };
}
