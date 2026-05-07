import { Type } from "@google/genai";
import type { ChatTool } from "./types";
import { searchProductIdsByTokens } from "./search-utils";

// LIMIT 50 → 30. 잘림 인지는 truncation_warning + total_count 로 처리.
// 더 많은 결과는 /transactions 페이지에서 조회.
const MAX_RESULTS = 30;
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

    // 품목 키워드 → 토큰 분리 + 별칭 매칭으로 product_id 집합 확보.
    // DB 단에서 .in() 으로 필터링.
    const matchedProductIds = productKeyword
      ? await searchProductIdsByTokens(ctx.supabase, productKeyword)
      : null;

    if (matchedProductIds && matchedProductIds.size === 0) {
      return {
        ok: true,
        count: 0,
        since: since.toISOString().slice(0, 10),
        truncated: false,
        keyword_used: productKeyword,
        transactions: [],
      };
    }

    let query = ctx.supabase
      .from("transactions")
      .select(
        `id, type, quantity, note, created_at, created_by,
         products!transactions_product_id_fkey ( name, variant, unit ),
         sites!transactions_site_id_fkey ( name ),
         vendors!transactions_vendor_id_fkey ( name )`,
        { count: "exact" },
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
    if (matchedProductIds) {
      query = query.in("product_id", Array.from(matchedProductIds));
    }

    const { data, count: totalCount, error } = await query;
    if (error) return { ok: false, error: error.message };

    const rows = data ?? [];

    // created_by 별칭 join 은 Supabase FK 추론 불안정 — 별도 매핑.
    const userIds = Array.from(
      new Set(
        rows
          .map((r) => r.created_by)
          .filter((v): v is string => typeof v === "string"),
      ),
    );
    const profileMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profiles } = await ctx.supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.id, p.name ?? null);
      }
    }

    const total = totalCount ?? rows.length;
    const isTruncated = total > rows.length;

    return {
      ok: true,
      count: rows.length,
      total_count: total,
      since: since.toISOString().slice(0, 10),
      truncated: isTruncated,
      truncation_warning: isTruncated
        ? `필터 조건 전체 ${total}건 중 최근 ${rows.length}건만 반환했습니다. 답변에 반드시 '전체 ${total}건 중 ${rows.length}건' 표시하고, 전체는 [입출고 내역 페이지 →](/transactions) 안내. '이게 전부' 라고 단정 금지.`
        : null,
      keyword_used: productKeyword || null,
      transactions: rows.map((r) => {
        const p = r.products as
          | { name?: string; variant?: string | null; unit?: string | null }
          | null;
        const site = r.sites as { name?: string } | null;
        const vendor = r.vendors as { name?: string } | null;
        return {
          date: r.created_at?.slice(0, 10) ?? null,
          type: r.type,
          product: p?.name ?? "(알 수 없음)",
          variant: p?.variant ?? null,
          quantity: r.quantity,
          unit: p?.unit ?? null,
          site: site?.name ?? null,
          vendor: vendor?.name ?? null,
          user: r.created_by ? profileMap.get(r.created_by) ?? null : null,
          note: r.note ?? null,
        };
      }),
    };
  },
};
