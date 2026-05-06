import { Type } from "@google/genai";
import type { ChatTool } from "./types";

const SITE_LIMIT = 10;

export const searchSiteTool: ChatTool = {
  declaration: {
    name: "search_site",
    description:
      "현장(사이트)을 검색합니다. 이름·주소·담당자 부분 일치. '신세계 강남 어디 있어?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: {
          type: Type.STRING,
          description: "검색 키워드 (이름·주소·담당자)",
        },
        only_active: {
          type: Type.BOOLEAN,
          description: "활성 현장만 (기본 true)",
        },
      },
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(args, ctx) {
    const keyword = typeof args.keyword === "string" ? args.keyword.trim() : "";
    const onlyActive = args.only_active !== false;

    let query = ctx.supabase
      .from("sites")
      .select(
        "id, name, address, contact, start_date, end_date, active, note",
      )
      .order("name", { ascending: true })
      .limit(SITE_LIMIT);

    if (keyword) {
      const like = `%${keyword}%`;
      query = query.or(
        `name.ilike.${like},address.ilike.${like},contact.ilike.${like}`,
      );
    }
    if (onlyActive) {
      query = query.eq("active", true);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      count: data?.length ?? 0,
      truncated: (data?.length ?? 0) === SITE_LIMIT,
      sites: (data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address ?? null,
        contact: s.contact ?? null,
        start_date: s.start_date ?? null,
        end_date: s.end_date ?? null,
        active: s.active,
        note: s.note ?? null,
      })),
    };
  },
};

export const getSiteDetailsTool: ChatTool = {
  declaration: {
    name: "get_site_details",
    description:
      "특정 현장의 상세 정보 + 배정된 담당자 + 최근 자재 요청 건수를 반환합니다.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        site_id: {
          type: Type.STRING,
          description: "현장 UUID. search_site 결과의 id 사용 권장.",
        },
        site_keyword: {
          type: Type.STRING,
          description: "site_id 가 없을 때. 이름 부분 일치로 단일 매칭 시도.",
        },
      },
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(args, ctx) {
    let siteId = typeof args.site_id === "string" ? args.site_id : undefined;
    const siteKeyword =
      typeof args.site_keyword === "string" ? args.site_keyword : "";

    if (!siteId && siteKeyword) {
      const { data: matches } = await ctx.supabase
        .from("sites")
        .select("id, name")
        .ilike("name", `%${siteKeyword}%`)
        .limit(2);
      if (!matches || matches.length === 0) {
        return { ok: false, error: `'${siteKeyword}' 일치 현장이 없습니다.` };
      }
      if (matches.length > 1) {
        return {
          ok: false,
          error: `'${siteKeyword}' 일치 현장이 여러 곳입니다.`,
          candidates: matches.map((m) => m.name),
        };
      }
      siteId = matches[0].id;
    }

    if (!siteId) {
      return {
        ok: false,
        error: "site_id 또는 site_keyword 중 하나가 필요합니다.",
      };
    }

    const [siteRes, assigneeRes, requestRes] = await Promise.all([
      ctx.supabase
        .from("sites")
        .select(
          "id, name, address, contact, start_date, end_date, active, note",
        )
        .eq("id", siteId)
        .maybeSingle(),
      ctx.supabase
        .from("profile_sites")
        .select(`profiles:profile_id ( name, title, phone )`)
        .eq("site_id", siteId),
      ctx.supabase
        .from("material_requests")
        .select("status", { count: "exact", head: false })
        .eq("site_id", siteId)
        .in("status", ["pending", "approved"]),
    ]);

    if (siteRes.error || !siteRes.data) {
      return { ok: false, error: "현장 정보를 찾을 수 없습니다." };
    }

    const assignees = (assigneeRes.data ?? [])
      .map((row) => {
        const p = row.profiles as
          | { name?: string; title?: string | null; phone?: string | null }
          | null;
        if (!p?.name) return null;
        return {
          name: p.name,
          title: p.title ?? null,
          phone: p.phone ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const pendingRequests = requestRes.count ?? requestRes.data?.length ?? 0;

    return {
      ok: true,
      site: {
        id: siteRes.data.id,
        name: siteRes.data.name,
        address: siteRes.data.address ?? null,
        contact: siteRes.data.contact ?? null,
        start_date: siteRes.data.start_date ?? null,
        end_date: siteRes.data.end_date ?? null,
        active: siteRes.data.active,
        note: siteRes.data.note ?? null,
      },
      assignees,
      pending_request_count: pendingRequests,
    };
  },
};
