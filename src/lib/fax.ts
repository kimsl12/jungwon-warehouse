/**
 * 팩스 발송 추상 레이어.
 *
 * 기본 전제: 스마트팩스(한국정보통신) REST API 규격을 기준으로 설계하되,
 * 인터페이스를 provider-agnostic 하게 유지하여 추후 다른 서비스로 쉽게
 * 교체할 수 있다.
 *
 * 현재 상태: **미활성**. 환경 변수가 모두 비어 있으면 sendFax 는
 * { ok: false, error: "FAX_NOT_CONFIGURED" } 를 반환하며, UI는 이 상태를
 * 사용자에게 명확히 보여준다 (API 키 발급 후 Vercel 환경변수 등록 시
 * 자동으로 활성화).
 *
 * 요구 환경변수:
 *   FAX_API_PROVIDER   — "smartfax" | 추후 확장. 기본 "smartfax"
 *   FAX_API_BASE_URL   — 예: https://api.ksnet.co.kr/fax/v1
 *   FAX_API_KEY        — 서비스 발급 API 키
 *   FAX_SENDER_NUMBER  — 발신 팩스번호 (예: 02-2645-0421)
 */

export type FaxSendInput = {
  /** 수신자(거래처) 팩스 번호 — 구분자 포함 가능 */
  toFaxNumber: string;
  /** 전송할 PDF 바이너리 */
  pdfBuffer: Uint8Array;
  /** 전송 이력 추적용 라벨 (예: "발주서 PO-20260424-001") */
  subject: string;
};

export type FaxSendResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string; detail?: string };

export function isFaxConfigured(): boolean {
  return Boolean(
    process.env.FAX_API_BASE_URL &&
      process.env.FAX_API_KEY &&
      process.env.FAX_SENDER_NUMBER,
  );
}

/** 구분자 제거 (숫자만 남김) */
function normalize(fax: string): string {
  return fax.replace(/[^0-9]/g, "");
}

/**
 * 팩스 발송. 환경 변수 미설정 시 에러 반환.
 * 실제 API 호출부는 스마트팩스 문서에 맞춰 채워야 한다. 현재는 스텁.
 */
export async function sendFax(input: FaxSendInput): Promise<FaxSendResult> {
  if (!isFaxConfigured()) {
    return { ok: false, error: "FAX_NOT_CONFIGURED" };
  }

  const to = normalize(input.toFaxNumber);
  if (to.length < 7) {
    return { ok: false, error: "INVALID_FAX_NUMBER" };
  }

  const provider = process.env.FAX_API_PROVIDER ?? "smartfax";

  if (provider !== "smartfax") {
    return {
      ok: false,
      error: "UNSUPPORTED_PROVIDER",
      detail: `Provider "${provider}" 는 아직 연동되지 않았습니다.`,
    };
  }

  // ---------------------------------------------------------------------------
  // 스마트팩스 API 호출 (스켈레톤)
  //
  // 실제 엔드포인트·필드명·인증 방식은 스마트팩스 공식 문서 기준으로 채울 것:
  //   https://www.smartfax.kr
  //
  // 일반적 흐름:
  //   1. PDF를 multipart/form-data 로 업로드하거나 base64 body 로 전송
  //   2. Authorization: Bearer <FAX_API_KEY>
  //   3. body: { sender, receiver, subject, file_data }
  //   4. 응답: { message_id, status }
  //
  // 키 발급 후 실제 API 규격에 맞춰 아래 코드 활성화.
  // ---------------------------------------------------------------------------
  try {
    // const base = process.env.FAX_API_BASE_URL!;
    // const key  = process.env.FAX_API_KEY!;
    // const from = normalize(process.env.FAX_SENDER_NUMBER!);
    //
    // const form = new FormData();
    // form.append("sender", from);
    // form.append("receiver", to);
    // form.append("subject", input.subject);
    // form.append("file", new Blob([input.pdfBuffer], { type: "application/pdf" }), "document.pdf");
    //
    // const res = await fetch(base + "/send", {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${key}` },
    //   body: form,
    // });
    //
    // if (!res.ok) {
    //   return { ok: false, error: "API_ERROR", detail: await res.text() };
    // }
    //
    // const json = await res.json() as { message_id?: string };
    // return { ok: true, providerMessageId: json.message_id ?? null };

    return {
      ok: false,
      error: "NOT_IMPLEMENTED",
      detail:
        "팩스 API 연동 코드가 아직 실제 호출로 연결되지 않았습니다. " +
        "스마트팩스 문서 확인 후 src/lib/fax.ts 의 주석된 블록을 활성화해주세요.",
    };
  } catch (err) {
    return {
      ok: false,
      error: "API_EXCEPTION",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
