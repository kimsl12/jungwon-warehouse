import { Type } from "@google/genai";
import type { ChatTool } from "./types";

const USER_LIMIT = 10;
const TX_LIMIT = 30;
const MAX_DAYS = 90;

export const findUserTool: ChatTool = {
  declaration: {
    name: "find_user",
    description:
      "[admin] 사용자(직원) 를 이름·이메일·연락처로 검색합니다. '철수가 누구야?', 'OO 연락처?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: {
          type: Type.STRING,
          description: "이름·이메일·연락처 부분 일치",
        },
      },
      required: [],
    },
  },
  roles: ["admin"],
  async execute(args, ctx) {
    const keyword = typeof args.keyword === "string" ? args.keyword.trim() : "";
    let query = ctx.supabase
      .from("profiles")
      .select("id, name, email, phone, title, role, created_at")
      .order("name", { ascending: true })
      .limit(USER_LIMIT);

    if (keyword) {
      const like = `%${keyword}%`;
      query = query.or(
        `name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
      );
    }
    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      count: data?.length ?? 0,
      truncated: (data?.length ?? 0) === USER_LIMIT,
      users: (data ?? []).map((u) => ({
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
        phone: u.phone ?? null,
        title: u.title ?? null,
        role: u.role,
      })),
    };
  },
};

export const findUserTransactionsTool: ChatTool = {
  declaration: {
    name: "find_user_transactions",
    description:
      "[admin] 특정 사용자가 등록한 입출고 내역을 반환합니다. '철수가 어제 뭐 출고했어?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        user_id: { type: Type.STRING, description: "사용자 UUID" },
        user_keyword: {
          type: Type.STRING,
          description: "user_id 가 없을 때. 이름·이메일 부분 일치 단일 매칭.",
        },
        days: {
          type: Type.INTEGER,
          description: `최근 N일 (기본 7, 최대 ${MAX_DAYS})`,
        },
        type: {
          type: Type.STRING,
          enum: ["in", "out", "all"],
        },
      },
      required: [],
    },
  },
  roles: ["admin"],
  async execute(args, ctx) {
    let userId = typeof args.user_id === "string" ? args.user_id : undefined;
    const userKeyword =
      typeof args.user_keyword === "string" ? args.user_keyword : "";
    const days = Math.min(Math.max(Number(args.days) || 7, 1), MAX_DAYS);
    const typeFilter = (args.type as string | undefined) ?? "all";

    if (!userId && userKeyword) {
      const { data: matches } = await ctx.supabase
        .from("profiles")
        .select("id, name")
        .or(`name.ilike.%${userKeyword}%,email.ilike.%${userKeyword}%`)
        .limit(2);
      if (!matches || matches.length === 0) {
        return { ok: false, error: `'${userKeyword}' 일치 사용자가 없습니다.` };
      }
      if (matches.length > 1) {
        return {
          ok: false,
          error: `'${userKeyword}' 일치 사용자가 여러 명입니다.`,
          candidates: matches.map((m) => m.name),
        };
      }
      userId = matches[0].id;
    }
    if (!userId) {
      return {
        ok: false,
        error: "user_id 또는 user_keyword 중 하나가 필요합니다.",
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = ctx.supabase
      .from("transactions")
      .select(
        `id, type, quantity, note, created_at,
         products!transactions_product_id_fkey ( name, variant, unit ),
         sites!transactions_site_id_fkey ( name )`,
      )
      .eq("created_by", userId)
      .gte("created_at", since.toISOString())
      .is("canceled_at", null)
      .order("created_at", { ascending: false })
      .limit(TX_LIMIT);

    if (typeFilter === "in" || typeFilter === "out") {
      query = query.eq("type", typeFilter);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      user_id: userId,
      count: data?.length ?? 0,
      since: since.toISOString().slice(0, 10),
      truncated: (data?.length ?? 0) === TX_LIMIT,
      transactions: (data ?? []).map((r) => {
        const p = r.products as
          | { name?: string; variant?: string | null; unit?: string | null }
          | null;
        const s = r.sites as { name?: string } | null;
        return {
          date: r.created_at?.slice(0, 10) ?? null,
          type: r.type,
          product: p?.name ?? "(알 수 없음)",
          variant: p?.variant ?? null,
          quantity: r.quantity,
          unit: p?.unit ?? null,
          site: s?.name ?? null,
          note: r.note ?? null,
        };
      }),
    };
  },
};
