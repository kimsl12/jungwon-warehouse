import { Type } from "@google/genai";
import type { ChatTool } from "./types";

type PageEntry = {
  path: string;
  label: string;
  /** 모바일 전용 또는 모바일 대안 경로 */
  mobilePath?: string;
  /** admin 만 접근 가능 */
  admin?: boolean;
};

const PAGE_MAP: Record<string, PageEntry> = {
  inventory: { path: "/inventory", label: "재고 페이지" },
  transactions: { path: "/transactions", label: "입출고 내역" },
  inbound: {
    path: "/inbound",
    label: "입고 페이지",
    mobilePath: "/m/inbound",
  },
  outbound: {
    path: "/outbound",
    label: "출고 페이지",
    mobilePath: "/m/outbound",
  },
  vendors: { path: "/vendors", label: "거래처 페이지" },
  sites: {
    path: "/sites",
    label: "현장 페이지",
    mobilePath: "/m/sites",
  },
  purchase_orders: { path: "/purchase-orders", label: "발주서 페이지" },
  requests: {
    path: "/requests",
    label: "자재 요청 페이지",
    mobilePath: "/m/request",
  },
  reports: { path: "/reports", label: "리포트 페이지" },
  overview: { path: "/overview", label: "대시보드" },
  scan: { path: "/m/scan", label: "모바일 자재 검색" },
  audit: { path: "/m/audit", label: "재고 실사" },
  activity_log: {
    path: "/activity-log",
    label: "활동 로그 페이지",
    admin: true,
  },
  users: { path: "/users", label: "사용자 관리 페이지", admin: true },
  ai_usage: { path: "/ai-usage", label: "AI 사용량 페이지", admin: true },
};

export const navigateToTool: ChatTool = {
  declaration: {
    name: "navigate_to",
    description:
      "사내 페이지 이동 링크 정보를 반환합니다. 사용자가 '재고 페이지 가고 싶어', '활동 로그 보여줘' 같은 페이지 이동 의사를 표현하면 호출하세요. 결과를 받으면 마크다운 링크 [페이지명 →](경로) 형태로 답변에 포함하세요. 변경 작업(등록/수정/삭제)은 절대 수행하지 말고 페이지 링크만 안내하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: {
          type: Type.STRING,
          description: `이동할 페이지 키. 사용 가능한 키: ${Object.keys(PAGE_MAP).join(", ")}`,
          enum: Object.keys(PAGE_MAP),
        },
        filter: {
          type: Type.STRING,
          description:
            "URL 쿼리스트링 (선택). 형식: 'keyword=HFIX&type=out'. 인코딩 불필요.",
        },
      },
      required: ["page"],
    },
  },
  roles: ["user", "admin"],
  async execute(args, ctx) {
    const page = String(args.page ?? "");
    const filter = typeof args.filter === "string" ? args.filter : undefined;
    const target = PAGE_MAP[page];
    if (!target) {
      return {
        ok: false,
        error: `알 수 없는 페이지 키: ${page}`,
        available_keys: Object.keys(PAGE_MAP),
      };
    }
    if (target.admin && ctx.userRole !== "admin") {
      return { ok: false, error: "이 페이지는 admin 권한이 필요합니다." };
    }
    let path = target.path;
    if (filter) {
      const sep = path.includes("?") ? "&" : "?";
      path = `${path}${sep}${filter}`;
    }
    return {
      ok: true,
      label: target.label,
      path,
      mobile_path: target.mobilePath ?? null,
    };
  },
};
