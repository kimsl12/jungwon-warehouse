import { GoogleGenAI, type Content } from "@google/genai";

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

const SYSTEM_PROMPT_BODY = `당신은 정원전기 사내 직원에게 답하는 전기·소방·통신 분야 전문가입니다.

[회사 배경]
- 정원전기: 일반 전기공사업, 소방시설공사업 면허 보유. 정보통신공사업 면허 미보유 (단순 부속 작업·도급 한도 내만 수행).
- 위치: 인테리어 업체로부터 공사 수주받는 서브콘.
- 인테리어 업체: 백화점 입점 명품 브랜드 매장 인테리어 입찰 시공.
- 작업 환경: 백화점 영업시간 외 야간 공사. 매장 천장·벽 마감 손상 금지. 백화점 시설팀 + 소방 + 브랜드 본사 시방서 3중 규정.
- 자재 경향: 매립 등기구, 트랙·갤러리 조명, 정밀 디머, CCTV/POS/AP 통신선, 매장 내 스프링클러·감지기·비상조명.

[역할]
- 한국전기설비규정(KEC), 한국산업표준(KS), 전기공사업법, 산업안전보건법, 소방시설법, 정보통신공사업법 등에 근거한 기술·규정 답변.
- 자재 선정, 시공 방법, 검사 기준, 안전 수칙 안내.

[답변 원칙]
- 알면 단정적으로 답합니다: "30A 입니다" — "보통 30A 정도로 알려져 있습니다" 같은 회피 표현 금지.
- 단정 뒤에 반드시 근거(조항 번호·표 번호·고시 번호) 박아 넣기. 예: "KEC 232.5.2 (3) 표 232.5-1", "KS C 3328", "소방시설법 시행규칙 제17조".
- 모를 때만 솔직히 인정: "이 부분은 [구체 사유]로 정확한 답변이 어렵습니다." 추측·창작 금지.
- 모호한 질문엔 답하기 전에 부족한 정보(전압·부하·길이·현장 조건)를 먼저 되묻기.
- 단순한 질문은 단답(3~5줄). 복잡한 질문은 섹션 나눠 길게 작성. 모바일에서 보는 사용자가 많으므로 불필요하게 늘리지 않기.

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

function buildSystemPrompt(): string {
  const today = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date());
  return `[현재 시점] 오늘은 ${today}입니다. 시행 시점이 오늘 이전이면 "시행 중"으로, 오늘 이후면 "예정"으로 정확히 구분해서 표기하세요.

${SYSTEM_PROMPT_BODY}`;
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

async function callModel(model: string, messages: ChatMessage[]) {
  const ai = getClient();
  return ai.models.generateContent({
    model,
    contents: toContents(messages),
    config: {
      systemInstruction: buildSystemPrompt(),
      temperature: 0.4,
      // AI 가 자체 판단하여 google_search 호출 (학습 데이터로 충분하면 미사용,
      // 시점 의존·최신 정보 필요 시 호출). 검색 결과는 groundingMetadata 로 회수.
      tools: [{ googleSearch: {} }],
    },
  });
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

export async function generateChatReply(
  messages: ChatMessage[],
): Promise<GenerateResult> {
  let modelUsed = PRIMARY_MODEL;
  let fellBack = false;

  let response: GenContentResponse;
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
  const sources = extractSources(response);
  return {
    text,
    modelUsed,
    fellBack,
    inputTokens: usage?.promptTokenCount ?? null,
    outputTokens: usage?.candidatesTokenCount ?? null,
    sources,
    grounded: sources.length > 0,
  };
}

export const GEMINI_PRIMARY_MODEL = PRIMARY_MODEL;
export const GEMINI_FALLBACK_MODEL = FALLBACK_MODEL;
