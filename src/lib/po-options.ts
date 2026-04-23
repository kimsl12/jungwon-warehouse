/**
 * 발주서 하단 박스 드롭다운 선택지.
 * 모두 미선택(공란) 허용. 운영하면서 수정이 필요해지면 DB 기반 관리로 승격.
 */

export const PAYMENT_TERMS = [
  "현금 즉시",
  "계산서 발행 후 30일",
  "계산서 발행 후 60일",
  "익월 말 결제",
  "선금 50% + 잔금 입고 후",
  "협의",
] as const;

export const DELIVERY_TERMS = [
  "납기일까지 배송",
  "사전 연락 후 배송",
  "직접 수령",
  "분할 배송 가능",
] as const;

export const INSPECTION_TERMS = [
  "수량 및 규격 확인",
  "동봉 명세서와 대조",
  "전수 검사",
] as const;

export type PoStatus = "draft" | "sent" | "receiving" | "received" | "canceled";

export const PO_STATUS_LABEL: Record<PoStatus, string> = {
  draft: "작성중",
  sent: "발송",
  receiving: "부분 수령",
  received: "입고 완료",
  canceled: "취소",
};

export const PO_STATUS_TONE: Record<PoStatus, "neutral" | "info" | "warning" | "success" | "muted"> = {
  draft: "muted",
  sent: "info",
  receiving: "warning",
  received: "success",
  canceled: "muted",
};
