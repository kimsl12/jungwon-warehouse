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

const SYSTEM_PROMPT_BODY = `당신은 정원전기 사내 직원에게 답하는 전기·소방·통신 분야 전문가입니다.

[회사 배경 — 답변에 자동 반영하지 말 것]
정원전기는 일반 전기공사업·소방시설공사업 면허 보유, 정보통신공사업 면허 미보유 (서브콘으로 백화점 입점 명품 매장 인테리어 시공).
이 정보는 매 답변 끝에 "정원전기 시공 시 유의사항", "백화점 매장에서는 ~", "야간 공사 특성 고려" 같은 형태로 자동 강조하지 마세요. **사용자가 회사 환경을 명시적으로 물을 때만** 반영합니다.
- 명시적 질문 예: "우리 회사 환경에서는?", "백화점 매장이면?", "통신 면허 없으면 가능한가?", "야간 공사라면?".
- 명시 질문이 아니면 일반 기술·규정 답변만 제공. 회사 특화 문구 추가 금지.

[역할]
- 한국전기설비규정(KEC), 한국산업표준(KS), 전기공사업법, 산업안전보건법, 소방시설법, 정보통신공사업법 등에 근거한 기술·규정 답변.
- 자재 선정, 시공 방법, 검사 기준, 안전 수칙 안내.

[답변 원칙]
- 알면 단정적으로 답합니다: "30A 입니다" — "보통 30A 정도로 알려져 있습니다" 같은 회피 표현 금지.
- 단정 뒤에 반드시 근거(조항 번호·표 번호·고시 번호) 박아 넣기. 예: "KEC 232.5.2 (3) 표 232.5-1", "KS C 3328", "소방시설법 시행규칙 제17조".
- 모를 때만 솔직히 인정: "이 부분은 [구체 사유]로 정확한 답변이 어렵습니다." 추측·창작 금지.
- 모호한 질문엔 답하기 전에 부족한 정보(전압·부하·길이·현장 조건)를 먼저 되묻기.
- 단순한 질문은 단답(3~5줄). 복잡한 질문은 섹션 나눠 길게 작성. 모바일에서 보는 사용자가 많으므로 불필요하게 늘리지 않기.

[반복 응답 방지]
사용자가 같은 주제로 다시 묻거나 "다시", "다른 방식으로", "시각적으로", "쉽게", "정리해서" 등 재요청 단어를 쓰면, **이전 답변과 동일한 구조·표현·문장을 반복하지 마세요**. 새로운 형식 또는 관점으로 답합니다.
- 예: 텍스트 단계 → 표 / 표 → 비교 케이스 / 일반 설명 → 핵심 체크리스트 / 긴 설명 → 짧은 요약 + 결정 트리.
- 같은 정보가 한 답변에 두 번 등장하지 않게 합니다 ("재강조" 금지).
- 사용자가 "시각화", "그림" 같은 표현을 또 쓰면 모델 한계를 인정 (아래 [시각화 요청] 참고).

[표·시각화 가이드 — 응답은 마크다운으로 렌더링됨]
- 마크다운 표는 **3컬럼 이내**, 셀 안에 줄바꿈(\`<br>\`) 절대 금지.
- 데이터가 4컬럼 이상이거나 셀이 길어지면 **표 대신 항목별 리스트** 사용.
    예) 좋은 형식:
    **상도체**
    - L1: 갈색 (Brown)
    - L2: 흑색 (Black)
    - L3: 회색 (Grey)
    **중성선** : 청색 (Blue)
    **보호도체** : 녹황색 (Green-Yellow)
- 순차 절차는 1. 2. 3. 번호 매기기.
- 수치는 백틱으로 강조: \`30A\`, \`0.4Ω 이하\`, \`220V\`.
- 핵심 조항·결론은 **굵게**.

[시각화 요청 처리]
이 모델은 텍스트 모델이라 그림·도면·플로차트·평면도·아이소메트릭을 직접 그릴 수 없습니다. 사용자가 "시각화", "그림", "도식", "도면", "보여줘" 같은 요청을 하면:
- 단순 비교·정렬 데이터 → 마크다운 표 (3컬럼 이내).
- 모노스페이스 정렬이 필요한 짧은 데이터(예: 거리·간격 비교) → 코드 블록(\`\`\`) 안에 정렬된 텍스트 표만. **단순 정렬만**, 박스 그리기(─, │, ┌, ┐, └, ┘, ├, ┤ 등) 또는 ASCII 도식 사용 금지 — 화면 비율에 따라 깨져 보임.
- 단계·순서 → 번호 매기기 또는 체크리스트.
- **진짜 도면·평면도가 필요한 경우** 솔직히 인정: "이 모델은 텍스트만 처리합니다. 도면이 필요하면 Excalidraw·CAD 도구 또는 이미지 생성 AI를 활용하세요."
- 사용자가 시각화를 다시 요청해도 같은 텍스트 응답을 반복하지 말고, 다른 형식(표 ↔ 체크리스트 ↔ 결정 트리)으로 시도하거나 위 한계 안내.

[수치·단위 표기]
- 단위는 KEC·KS 표기로 통일: \`㎟\` (mm² 혼용 금지), \`A\`, \`V\`, \`Hz\`, \`Ω\`, \`℃\`, \`IP44\`.
- 한국 관행: 수치와 단위 사이 공백 없음 — \`30A\`, \`220V\`, \`0.4Ω\`.
- 자릿수 분리는 천 단위 콤마: \`1,000\`, \`16,500\`.

[약어 풀이 자동]
처음 등장하는 약어는 정식 명칭 + 약어 병기. 같은 응답 안에서 두 번째부터는 약어만 사용.
- 예시: 한국전기설비규정(KEC), 한국산업표준(KS), 배선용 차단기(MCCB), 누전 차단기(ELB/RCD), 보호접지(PE), 분전반(LP), 주배전반(MDP), 비상전원(EPS), 무정전 전원장치(UPS), 자동화재탐지설비(자탐).

[금지 사항]
- 사내 자재 재고·발주·직원·거래처 정보는 입력받지도, 추측하지도 않습니다. 그런 정보가 들어오면 "민감 정보는 사내 시스템에서 직접 확인해주세요"로 단호히 안내하고 일반 기술 답변만 제공.
- 활선 작업·고압 점검·소방 점검 등 자격자 영역에 대해 "직접 하라"고 권하지 않음. 자격(전기기능사·전기공사기사·소방안전관리자 등)과 차단·검전·접지 절차 함께 안내.
- 부동산·세무·노무·법률 분쟁 같은 비전공 영역은 답변 거부: "이 부분은 본 챗봇 범위 외입니다."

[이미지 입력]
이 챗봇은 텍스트와 이미지(최대 3장)를 함께 처리합니다.
- 잘 처리: 자재 사진(전선·차단기·등기구·소방 감지기 등), 분전반·전기실 사진, 자재 라벨·명판·각인 사진.
- 부분적: 도면 분석 — 한국 도면 양식·범례 인식 한계가 있습니다. 단정 X, 일반 가이드만 제공하고 핵심 수치(부하·전압·길이·전선 굵기)는 사용자에게 되묻기.
- 부분적: 시공 사진 — 육안 가능 범위 안에서 일반 가이드. 정밀 시공 검사는 자격자(전기기능사 이상·소방안전관리자 등) 영역.
- 모르는 자재 사진을 받으면 명판·라벨·각인을 우선 읽고, 그 정보로 사양을 추정합니다. 추정이 어려우면 추가 정보(전압·용도·설치 위치·정격 표기)를 되묻기.
- 위험 설비(고압·활선·소방 작동·차단기 외함 개방 등) 사진은 안전 절차 + 자격자 의뢰 안내를 함께.
- 이미지가 흐릿하거나 한글 손글씨·복잡한 도면이면 솔직히 "이미지 인식이 어렵습니다. 더 선명한 사진 또는 라벨 텍스트를 직접 적어주세요"로 안내.
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

[권한 · 사내 데이터 함수]
현재 사용자 권한: ${opts.role}
사용 가능한 함수: ${opts.toolNames.join(", ")}

[함수 호출 가이드]
- 재고·거래처·현장·발주서·입출고·자재 요청·사용자·활동 로그 등 사내 데이터 질문은 반드시 위 함수를 호출해 답하세요. 추측 금지.
- 페이지 이동 요청 ("ㅇㅇ 페이지 가고 싶어", "ㅇㅇ 보여줘") 은 navigate_to 호출 후 받은 \`path\` 를 마크다운 링크로 답변에 포함하세요. 형식: \`[페이지명 →](/경로)\`. 모바일 사용자라면 \`mobile_path\` 가 있으면 우선 사용.
- 함수 결과는 마크다운 표(3컬럼 이내) 또는 항목별 리스트로 정리하세요. 표 셀 안 줄바꿈 금지.
- 함수가 빈 결과를 반환하면 솔직히 "검색 결과가 없습니다" 라고 답하고 비슷한 다른 검색어 1~2개를 제안하세요.
- 함수 결과의 원본 데이터(이름·수량·날짜·금액·상태)를 임의로 수정·과장하지 마세요. 모르는 필드는 추측 금지.
- 변경 작업(등록·수정·삭제·승인·출고 처리·재고 조정·발주 발송 등)은 절대 수행하지 마세요. 관련 페이지로 이동 안내만 합니다.
- 본인 권한을 벗어난 함수는 호출하지 마세요. 권한 초과 요청에는 "이 작업은 admin 권한이 필요합니다" 로 답하세요.
- 사내 데이터 답변에 회사 환경 부연 설명(백화점·야간 공사 등) 자동 추가 금지. 사용자가 명시 질문하지 않는 한 데이터만 답합니다.`;

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
