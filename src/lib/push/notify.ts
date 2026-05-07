import "server-only";

import { sendToAllAdmins } from "./send";

// 도메인 단위 알림 헬퍼. send.ts(저수준) 위에서 페이로드를 도메인 의미에 맞게 구성.
// 발송 실패는 호출 측에서 try/catch — 비즈니스 로직(신청·재고 처리)을 막지 않음.

export async function notifyNewMaterialRequest(args: {
  requestId: string;
  siteName: string | null;
  submitterName: string | null;
  itemCount: number;
  isUrgent: boolean;
}): Promise<void> {
  const prefix = args.isUrgent ? "[긴급] " : "";
  const site = args.siteName ?? "현장 미지정";
  const who = args.submitterName ?? "사용자";
  await sendToAllAdmins({
    title: `${prefix}자재 신청 ${args.itemCount}건`,
    body: `${who} • ${site}`,
    url: `/requests/${args.requestId}`,
    tag: `request-${args.requestId}`,
  });
}

export async function notifyLowStock(args: {
  productId: string;
  productName: string;
  variant: string | null;
  currentQuantity: number;
  unit: string | null;
  minQuantity: number;
}): Promise<void> {
  const fullName = args.variant
    ? `${args.productName} (${args.variant})`
    : args.productName;
  const unit = args.unit ?? "";
  await sendToAllAdmins({
    title: "재고 부족",
    body: `${fullName} • 현재 ${args.currentQuantity}${unit} (최소 ${args.minQuantity}${unit})`,
    url: "/inventory?filter=low_stock",
    tag: `low-stock-${args.productId}`,
  });
}
