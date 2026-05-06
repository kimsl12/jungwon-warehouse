import { Type } from "@google/genai";
import type { ChatTool } from "./types";

const LOG_LIMIT = 25;
const MAX_DAYS = 30;

const TABLE_VALUES = [
  "products",
  "transactions",
  "vendors",
  "sites",
  "purchase_orders",
  "material_requests",
  "profiles",
] as const;

export const getActivityLogTool: ChatTool = {
  declaration: {
    name: "get_activity_log",
    description:
      "[admin] 최근 활동 로그를 조회합니다. action·table·user 필터 가능. '오늘 누가 뭐 수정했어?', '발주서 변경 이력?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: {
          type: Type.INTEGER,
          description: `최근 N일 (기본 1, 최대 ${MAX_DAYS})`,
        },
        action: {
          type: Type.STRING,
          enum: ["create", "update", "delete", "in", "out"],
          description: "create/update/delete = CRUD, in/out = 입고/출고",
        },
        table_name: {
          type: Type.STRING,
          enum: [...TABLE_VALUES],
        },
        user_keyword: {
          type: Type.STRING,
          description: "사용자 이름·이메일 부분 일치 (단일 매칭 시도)",
        },
      },
      required: [],
    },
  },
  roles: ["admin"],
  async execute(args, ctx) {
    const days = Math.min(Math.max(Number(args.days) || 1, 1), MAX_DAYS);
    const action = typeof args.action === "string" ? args.action : "";
    const tableName =
      typeof args.table_name === "string" ? args.table_name : "";
    const userKeyword =
      typeof args.user_keyword === "string" ? args.user_keyword : "";

    let userId: string | undefined;
    if (userKeyword) {
      const { data: matches } = await ctx.supabase
        .from("profiles")
        .select("id, name")
        .or(`name.ilike.%${userKeyword}%,email.ilike.%${userKeyword}%`)
        .limit(2);
      if (!matches || matches.length === 0) {
        return { ok: false, error: `'${userKeyword}' 일치 사용자 없음` };
      }
      if (matches.length > 1) {
        return {
          ok: false,
          error: `'${userKeyword}' 일치 사용자 여러 명`,
          candidates: matches.map((m) => m.name),
        };
      }
      userId = matches[0].id;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = ctx.supabase
      .from("activity_logs")
      .select(
        `id, action, table_name, record_id, details, created_at,
         profiles:user_id ( name, email )`,
      )
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(LOG_LIMIT);

    if (action) query = query.eq("action", action);
    if (tableName) query = query.eq("table_name", tableName);
    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      count: data?.length ?? 0,
      since: since.toISOString().slice(0, 10),
      truncated: (data?.length ?? 0) === LOG_LIMIT,
      logs: (data ?? []).map((r) => {
        const p = r.profiles as
          | { name?: string; email?: string | null }
          | null;
        return {
          time: r.created_at,
          action: r.action,
          table: r.table_name,
          record_id: r.record_id,
          user: p?.name ?? "(시스템)",
          details_summary: summarizeDetails(r.details),
        };
      }),
    };
  },
};

function summarizeDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  // jsonb 가 너무 크면 키 목록만 노출 — 토큰 절약
  const keys = Object.keys(details as Record<string, unknown>);
  if (keys.length === 0) return null;
  if (keys.length <= 3) {
    try {
      return JSON.stringify(details).slice(0, 200);
    } catch {
      return keys.join(",");
    }
  }
  return `keys: ${keys.slice(0, 6).join(", ")}${keys.length > 6 ? "..." : ""}`;
}
