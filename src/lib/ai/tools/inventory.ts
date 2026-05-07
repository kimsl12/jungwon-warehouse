import { Type } from "@google/genai";
import type { ChatTool } from "./types";
import { searchProductIdsByTokens } from "./search-utils";

const MAX_RESULTS = 15;

export const searchInventoryTool: ChatTool = {
  declaration: {
    name: "search_inventory",
    description:
      "사내 재고 품목을 이름·분류·위치로 검색합니다. 사용자가 자재 재고 수량·위치·단위를 묻거나 '재고 있어?', 'ㅇㅇ 어디 있지?' 같이 물으면 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: {
          type: Type.STRING,
          description:
            "품목명·분류·세부분류·variant 에서 부분 일치로 검색할 키워드. 예: 'HFIX', '4스퀘어', '등기구'",
        },
        category: {
          type: Type.STRING,
          description: "분류 정확 일치 필터 (선택). 예: '전선', '조명'",
        },
        only_low_stock: {
          type: Type.BOOLEAN,
          description: "재고 부족(quantity ≤ min_quantity) 품목만 반환",
        },
      },
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(args, ctx) {
    const keyword = typeof args.keyword === "string" ? args.keyword.trim() : "";
    const category =
      typeof args.category === "string" ? args.category.trim() : "";
    const onlyLowStock = args.only_low_stock === true;

    // 키워드 → 토큰 분리 + product_aliases 매칭. 모든 토큰이 매칭되는
    // product_id 의 교집합. 키워드 비어있으면 null (필터 안 씀).
    const matchedIds = keyword
      ? await searchProductIdsByTokens(ctx.supabase, keyword)
      : null;

    if (matchedIds && matchedIds.size === 0) {
      return {
        ok: true,
        count: 0,
        truncated: false,
        keyword_used: keyword,
        products: [],
      };
    }

    let query = ctx.supabase
      .from("products")
      .select(
        "id, name, variant, category, subcategory, unit, quantity, min_quantity, location",
        { count: "exact" },
      )
      .order("name", { ascending: true })
      .limit(MAX_RESULTS);

    if (matchedIds) {
      query = query.in("id", Array.from(matchedIds));
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data, count: totalCount, error } = await query;
    if (error) return { ok: false, error: error.message };

    let products = data ?? [];
    if (onlyLowStock) {
      products = products.filter((p) => p.quantity <= p.min_quantity);
    }

    const total = totalCount ?? products.length;
    const isTruncated = total > products.length && !onlyLowStock;

    return {
      ok: true,
      count: products.length,
      total_count: total,
      truncated: isTruncated,
      truncation_warning: isTruncated
        ? `전체 ${total}건 중 ${products.length}건만 반환. 답변에 명시하고 [재고 페이지 →](/inventory) 안내.`
        : null,
      keyword_used: keyword || null,
      products: products.map((p) => ({
        name: p.name,
        variant: p.variant ?? null,
        category: p.category ?? null,
        subcategory: p.subcategory ?? null,
        unit: p.unit ?? null,
        quantity: p.quantity,
        min_quantity: p.min_quantity,
        location: p.location ?? null,
        is_low: p.quantity <= p.min_quantity,
      })),
    };
  },
};

export const findLowStockTool: ChatTool = {
  declaration: {
    name: "find_low_stock",
    description:
      "현재 재고가 최소 재고 기준 이하인 모든 품목을 반환합니다. '재고 부족한 거 있어?', '발주해야 할 자재?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(_args, ctx) {
    const { data, error } = await ctx.supabase.rpc("get_low_stock_products");
    if (error) return { ok: false, error: error.message };
    const products = (data ?? []).slice(0, 30);
    return {
      ok: true,
      count: products.length,
      truncated: (data?.length ?? 0) > 30,
      products: products.map((p) => ({
        name: p.name,
        variant: p.variant ?? null,
        category: p.category ?? null,
        unit: p.unit ?? null,
        quantity: p.quantity,
        min_quantity: p.min_quantity,
        location: p.location ?? null,
        shortage: Math.max(0, p.min_quantity - p.quantity),
      })),
    };
  },
};
