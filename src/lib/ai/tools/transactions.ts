import { Type } from "@google/genai";
import type { ChatTool } from "./types";

const MAX_RESULTS = 20;
const MAX_DAYS = 90;

export const findRecentTransactionsTool: ChatTool = {
  declaration: {
    name: "find_recent_transactions",
    description:
      "최근 입출고 내역을 조회합니다. 기간·구분(in/out)·품목·현장·본인 여부로 필터 가능. '어제 출고 뭐 있었어?', '내가 등록한 입고 보여줘' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: {
          type: Type.INTEGER,
          description: `최근 N일 범위 (기본 7, 최대 ${MAX_DAYS})`,
        },
        type: {
          type: Type.STRING,
          enum: ["in", "out", "all"],
          description: "in=입고, out=출고, all=전체",
        },
        product_keyword: {
          type: Type.STRING,
          description: "품목명 부분 일치 필터 (선택)",
        },
        only_mine: {
          type: Type.BOOLEAN,
          description: "본인이 등록한 내역만 (created_by = 현재 사용자)",
        },
      },
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(args, ctx) {
    const days = Math.min(
      Math.max(Number(args.days) || 7, 1),
      MAX_DAYS,
    );
    const typeFilter = (args.type as string | undefined) ?? "all";
    const productKeyword =
      typeof args.product_keyword === "string"
        ? args.product_keyword.trim()
        : "";
    const onlyMine = args.only_mine === true;

    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = ctx.supabase
      .from("transactions")
      .select(
        `id, type, quantity, note, created_at, created_by,
         products!transactions_product_id_fkey ( name, variant, unit ),
         sites!transactions_site_id_fkey ( name ),
         vendors!transactions_vendor_id_fkey ( name ),
         profiles:created_by ( name )`,
      )
      .gte("created_at", since.toISOString())
      .is("canceled_at", null)
      .order("created_at", { ascending: false })
      .limit(MAX_RESULTS);

    if (typeFilter === "in" || typeFilter === "out") {
      query = query.eq("type", typeFilter);
    }
    if (onlyMine) {
      query = query.eq("created_by", ctx.userId);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    let rows = data ?? [];
    if (productKeyword) {
      const lower = productKeyword.toLowerCase();
      rows = rows.filter((r) => {
        const p = r.products as { name?: string; variant?: string } | null;
        return (
          p?.name?.toLowerCase().includes(lower) ||
          p?.variant?.toLowerCase().includes(lower)
        );
      });
    }

    return {
      ok: true,
      count: rows.length,
      since: since.toISOString().slice(0, 10),
      truncated: rows.length === MAX_RESULTS,
      transactions: rows.map((r) => {
        const p = r.products as
          | { name?: string; variant?: string | null; unit?: string | null }
          | null;
        const site = r.sites as { name?: string } | null;
        const vendor = r.vendors as { name?: string } | null;
        const profile = r.profiles as { name?: string } | null;
        return {
          date: r.created_at?.slice(0, 10) ?? null,
          type: r.type,
          product: p?.name ?? "(알 수 없음)",
          variant: p?.variant ?? null,
          quantity: r.quantity,
          unit: p?.unit ?? null,
          site: site?.name ?? null,
          vendor: vendor?.name ?? null,
          user: profile?.name ?? null,
          note: r.note ?? null,
        };
      }),
    };
  },
};
