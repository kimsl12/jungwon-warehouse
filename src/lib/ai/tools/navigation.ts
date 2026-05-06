import { Type } from "@google/genai";
import type { ChatTool, ToolRole } from "./types";

type PageEntry = {
  path: string;
  label: string;
  /** 모바일 대안 경로 (있으면 user 에게 우선 안내) */
  mobilePath?: string;
  /**
   * 접근 가능한 역할.
   * 미들웨어 정책: user 는 /m/request*, /m/ai-chat, /api/* 만 접근 가능.
   * 따라서 navigate_to 안내도 그 정책과 일치시켜야 헛된 안내가 안 됨.
   * 미지정 시 admin only.
   */
  allowedRoles?: readonly ToolRole[];
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
    // user 도 자기 자재 요청 페이지는 접근 가능 (mobile_path 로 안내).
    allowedRoles: ["user", "admin"],
  },
  reports: { path: "/reports", label: "리포트 페이지" },
  overview: { path: "/overview", label: "대시보드" },
  scan: { path: "/m/scan", label: "모바일 자재 검색" },
  audit: { path: "/m/audit", label: "재고 실사" },
  activity_log: { path: "/activity-log", label: "활동 로그 페이지" },
  users: { path: "/users", label: "사용자 관리 페이지" },
  ai_usage: { path: "/ai-usage", label: "AI 사용량 페이지" },
};

function appendFilter(path: string, filter?: string): string {
  if (!filter) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${filter}`;
}

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
    const allowed = target.allowedRoles ?? ["admin"];
    if (!allowed.includes(ctx.userRole)) {
      return {
        ok: false,
        error: `이 페이지는 ${allowed.join("/")} 권한이 필요합니다. user 권한으로 안내 가능한 페이지는 '자재 요청 (requests)' 입니다.`,
      };
    }
    // user 는 미들웨어 정책상 데스크톱 경로 접근 불가. mobile_path 우선.
    const primaryPath =
      ctx.userRole === "user" && target.mobilePath
        ? target.mobilePath
        : target.path;
    return {
      ok: true,
      label: target.label,
      path: appendFilter(primaryPath, filter),
      mobile_path: target.mobilePath
        ? appendFilter(target.mobilePath, filter)
        : null,
    };
  },
};
