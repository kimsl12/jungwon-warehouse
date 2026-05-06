import { Type } from "@google/genai";
import type { ChatTool } from "./types";

const MAX_DAYS = 30;

export const getChatbotUsageStatsTool: ChatTool = {
  declaration: {
    name: "get_chatbot_usage_stats",
    description:
      "[admin] 챗봇 전체 사용량 통계 (일별 호출/모델별/이미지/고유사용자) 를 반환합니다. '이번달 챗봇 사용량?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: {
          type: Type.INTEGER,
          description: `최근 N일 (기본 14, 최대 ${MAX_DAYS})`,
        },
      },
      required: [],
    },
  },
  roles: ["admin"],
  async execute(args, ctx) {
    const days = Math.min(Math.max(Number(args.days) || 14, 1), MAX_DAYS);
    const { data, error } = await ctx.supabase.rpc("gemini_usage_daily", {
      p_days: days,
    });
    if (error) return { ok: false, error: error.message };

    const rows = (data ?? []).slice().sort((a, b) =>
      a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
    );

    const totals = rows.reduce(
      (acc, r) => {
        acc.total_calls += r.total_calls ?? 0;
        acc.flash_calls += r.flash_calls ?? 0;
        acc.flash_lite_calls += r.flash_lite_calls ?? 0;
        acc.image_calls += r.image_calls ?? 0;
        acc.fell_back_calls += r.fell_back_calls ?? 0;
        return acc;
      },
      {
        total_calls: 0,
        flash_calls: 0,
        flash_lite_calls: 0,
        image_calls: 0,
        fell_back_calls: 0,
      },
    );

    return {
      ok: true,
      days,
      totals,
      daily: rows.map((r) => ({
        day: r.day,
        total: r.total_calls,
        flash: r.flash_calls,
        flash_lite: r.flash_lite_calls,
        image: r.image_calls,
        fell_back: r.fell_back_calls,
        unique_users: r.unique_users,
      })),
    };
  },
};
