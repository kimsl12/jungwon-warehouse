import { Type } from "@google/genai";
import type { ChatTool } from "./types";

const VENDOR_LIMIT = 10;
const PRICE_LIMIT = 30;

export const searchVendorTool: ChatTool = {
  declaration: {
    name: "search_vendor",
    description:
      "거래처(자재상)를 검색합니다. 이름·담당자·전화·주소 부분 일치. '거래처 ㅇㅇ상사 정보 알려줘' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: {
          type: Type.STRING,
          description: "검색 키워드 (이름·담당자·연락처·주소)",
        },
        only_active: {
          type: Type.BOOLEAN,
          description: "활성 거래처만 (기본 true)",
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
      .from("vendors")
      .select(
        "id, name, ceo, contact_person, contact_phone, fax, email, address, active, note",
      )
      .order("name", { ascending: true })
      .limit(VENDOR_LIMIT);

    if (keyword) {
      const like = `%${keyword}%`;
      query = query.or(
        `name.ilike.${like},ceo.ilike.${like},contact_person.ilike.${like},contact_phone.ilike.${like},address.ilike.${like}`,
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
      truncated: (data?.length ?? 0) === VENDOR_LIMIT,
      vendors: (data ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        ceo: v.ceo ?? null,
        contact_person: v.contact_person ?? null,
        contact_phone: v.contact_phone ?? null,
        fax: v.fax ?? null,
        email: v.email ?? null,
        address: v.address ?? null,
        active: v.active,
        note: v.note ?? null,
      })),
    };
  },
};

export const getVendorPricesTool: ChatTool = {
  declaration: {
    name: "get_vendor_prices",
    description:
      "특정 거래처가 공급하는 자재의 단가 목록을 반환합니다. 'ㅇㅇ상사 단가 얼마야?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        vendor_id: {
          type: Type.STRING,
          description: "거래처 UUID. search_vendor 결과의 id 사용 권장.",
        },
        vendor_keyword: {
          type: Type.STRING,
          description:
            "vendor_id 가 없을 때 사용. 거래처 이름 부분 일치로 단일 매칭 시도.",
        },
        product_keyword: {
          type: Type.STRING,
          description: "품목명 부분 일치 필터 (선택)",
        },
      },
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(args, ctx) {
    let vendorId =
      typeof args.vendor_id === "string" ? args.vendor_id : undefined;
    const vendorKeyword =
      typeof args.vendor_keyword === "string" ? args.vendor_keyword : "";
    const productKeyword =
      typeof args.product_keyword === "string" ? args.product_keyword : "";

    if (!vendorId && vendorKeyword) {
      const { data: matches } = await ctx.supabase
        .from("vendors")
        .select("id, name")
        .ilike("name", `%${vendorKeyword}%`)
        .limit(2);
      if (!matches || matches.length === 0) {
        return {
          ok: false,
          error: `'${vendorKeyword}' 와 일치하는 거래처가 없습니다.`,
        };
      }
      if (matches.length > 1) {
        return {
          ok: false,
          error: `'${vendorKeyword}' 와 일치하는 거래처가 여러 곳입니다. 구체적인 이름이나 vendor_id 가 필요합니다.`,
          candidates: matches.map((m) => m.name),
        };
      }
      vendorId = matches[0].id;
    }

    if (!vendorId) {
      return {
        ok: false,
        error: "vendor_id 또는 vendor_keyword 중 하나가 필요합니다.",
      };
    }

    const query = ctx.supabase
      .from("vendor_product_prices")
      .select(
        `unit_price, note, updated_at,
         products!vendor_product_prices_product_id_fkey ( name, variant, unit, category ),
         vendors!vendor_product_prices_vendor_id_fkey ( name )`,
      )
      .eq("vendor_id", vendorId)
      .limit(PRICE_LIMIT);

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

    const vendorName =
      (rows[0]?.vendors as { name?: string } | null)?.name ?? null;

    return {
      ok: true,
      vendor_name: vendorName,
      count: rows.length,
      truncated: rows.length === PRICE_LIMIT,
      prices: rows.map((r) => {
        const p = r.products as {
          name?: string;
          variant?: string | null;
          unit?: string | null;
          category?: string | null;
        } | null;
        return {
          product: p?.name ?? "(알 수 없음)",
          variant: p?.variant ?? null,
          category: p?.category ?? null,
          unit: p?.unit ?? null,
          unit_price: r.unit_price,
          note: r.note ?? null,
          updated_at: r.updated_at?.slice(0, 10) ?? null,
        };
      }),
    };
  },
};
