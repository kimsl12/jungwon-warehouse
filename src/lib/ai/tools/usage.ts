import { Type } from "@google/genai";
import type { ChatTool } from "./types";

type QuotaResult = {
  allowed: boolean;
  reason: string | null;
  user_used: number;
  global_used: number;
  is_admin: boolean;
  user_limit: number;
  global_limit: number;
};

export const getMyQuotaTool: ChatTool = {
  declaration: {
    name: "get_my_quota",
    description:
      "내(현재 사용자) AI 챗봇 사용량 한도를 반환합니다. '한도 얼마 남았어?', '오늘 몇 번 썼어?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(_args, ctx) {
    const { data, error } = await ctx.supabase.rpc("check_gemini_quota");
    if (error || !data) {
      return { ok: false, error: error?.message ?? "한도 조회 실패" };
    }
    const quota = data as unknown as QuotaResult;
    return {
      ok: true,
      is_admin: quota.is_admin,
      user_used: quota.user_used,
      user_limit: quota.user_limit,
      user_remaining: Math.max(0, quota.user_limit - quota.user_used),
      global_used: quota.global_used,
      global_limit: quota.global_limit,
      global_remaining: Math.max(0, quota.global_limit - quota.global_used),
      note: quota.is_admin
        ? "admin 은 사용량 한도가 면제됩니다. 위 수치는 참고용입니다."
        : null,
    };
  },
};
