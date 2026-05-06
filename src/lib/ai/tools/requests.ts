import { Type } from "@google/genai";
import type { ChatTool } from "./types";

const LIMIT = 15;
const MAX_DAYS = 90;

const STATUS_VALUES = [
  "submitted",
  "approved",
  "fulfilled",
  "canceled",
  "rejected",
] as const;

export const findRequestStatusTool: ChatTool = {
  declaration: {
    name: "find_request_status",
    description:
      "현장에서 올라온 자재 요청 현황을 조회합니다. 사이트·상태·긴급여부·기간 필터 가능. '미처리 요청 있어?', 'ㅇㅇ 현장 요청 진행 중?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        site_keyword: {
          type: Type.STRING,
          description: "현장명 부분 일치 (선택)",
        },
        status: {
          type: Type.STRING,
          enum: [...STATUS_VALUES],
          description:
            "submitted=요청, approved=승인, fulfilled=출고완료, canceled=취소, rejected=반려",
        },
        only_pending: {
          type: Type.BOOLEAN,
          description:
            "처리 대기(submitted+approved) 만 (기본 false). status 보다 우선.",
        },
        only_urgent: {
          type: Type.BOOLEAN,
          description: "긴급 요청만",
        },
        days: {
          type: Type.INTEGER,
          description: `최근 N일 (기본 14, 최대 ${MAX_DAYS})`,
        },
      },
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(args, ctx) {
    const days = Math.min(Math.max(Number(args.days) || 14, 1), MAX_DAYS);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const siteKeyword =
      typeof args.site_keyword === "string" ? args.site_keyword.trim() : "";
    const status = typeof args.status === "string" ? args.status : "";
    const onlyPending = args.only_pending === true;
    const onlyUrgent = args.only_urgent === true;

    let query = ctx.supabase
      .from("material_requests")
      .select(
        `id, status, is_urgent, urgent_reason, note, created_at, approved_at, fulfilled_at,
         sites!material_requests_site_id_fkey ( name ),
         material_request_items ( requested_quantity, fulfilled_quantity ),
         profiles:created_by ( name )`,
      )
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    if (onlyPending) {
      query = query.in("status", ["submitted", "approved"]);
    } else if (status) {
      query = query.eq("status", status);
    }
    if (onlyUrgent) {
      query = query.eq("is_urgent", true);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    let rows = data ?? [];
    if (siteKeyword) {
      const lower = siteKeyword.toLowerCase();
      rows = rows.filter((r) => {
        const s = r.sites as { name?: string } | null;
        return s?.name?.toLowerCase().includes(lower);
      });
    }

    return {
      ok: true,
      count: rows.length,
      truncated: rows.length === LIMIT,
      since: since.toISOString().slice(0, 10),
      requests: rows.map((r) => {
        const items = (r.material_request_items ?? []) as unknown as Array<{
          requested_quantity: number;
          fulfilled_quantity: number;
        }>;
        const totalRequested = items.reduce(
          (sum, it) => sum + it.requested_quantity,
          0,
        );
        const totalFulfilled = items.reduce(
          (sum, it) => sum + it.fulfilled_quantity,
          0,
        );
        const s = r.sites as { name?: string } | null;
        const profile = r.profiles as { name?: string } | null;
        return {
          id: r.id,
          site: s?.name ?? null,
          status: r.status,
          is_urgent: r.is_urgent,
          urgent_reason: r.urgent_reason ?? null,
          requester: profile?.name ?? null,
          item_count: items.length,
          total_requested: totalRequested,
          total_fulfilled: totalFulfilled,
          created_at: r.created_at?.slice(0, 10) ?? null,
          approved_at: r.approved_at?.slice(0, 10) ?? null,
          fulfilled_at: r.fulfilled_at?.slice(0, 10) ?? null,
          note: r.note ?? null,
        };
      }),
    };
  },
};
