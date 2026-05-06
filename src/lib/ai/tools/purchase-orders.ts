import { Type } from "@google/genai";
import type { ChatTool } from "./types";

const LIMIT = 15;
const MAX_DAYS = 180;

const STATUS_VALUES = [
  "draft",
  "sent",
  "receiving",
  "completed",
  "canceled",
] as const;

export const findPurchaseOrderTool: ChatTool = {
  declaration: {
    name: "find_purchase_order",
    description:
      "발주서를 검색합니다. 발주번호·거래처·상태·기간 필터 가능. '이번주 발주서?', 'ㅇㅇ상사 발주 어디 있지?' 같은 질문에 호출하세요.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        po_number_keyword: {
          type: Type.STRING,
          description: "발주번호 부분 일치 (선택)",
        },
        vendor_keyword: {
          type: Type.STRING,
          description: "거래처명 부분 일치 (선택)",
        },
        status: {
          type: Type.STRING,
          enum: [...STATUS_VALUES],
          description:
            "draft=작성중, sent=발송, receiving=일부수령, completed=완료, canceled=취소",
        },
        days: {
          type: Type.INTEGER,
          description: `최근 N일 (기본 30, 최대 ${MAX_DAYS})`,
        },
      },
      required: [],
    },
  },
  roles: ["user", "admin"],
  async execute(args, ctx) {
    const days = Math.min(Math.max(Number(args.days) || 30, 1), MAX_DAYS);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const poKeyword =
      typeof args.po_number_keyword === "string"
        ? args.po_number_keyword.trim()
        : "";
    const vendorKeyword =
      typeof args.vendor_keyword === "string" ? args.vendor_keyword.trim() : "";
    const status = typeof args.status === "string" ? args.status : "";

    let query = ctx.supabase
      .from("purchase_orders")
      .select(
        `id, po_number, status, order_date, due_date, sent_at, completed_at, ship_to,
         vendors!purchase_orders_vendor_id_fkey ( name, contact_person ),
         purchase_order_items ( ordered_quantity, received_quantity, unit_price )`,
      )
      .gte("order_date", since.toISOString().slice(0, 10))
      .order("order_date", { ascending: false })
      .limit(LIMIT);

    if (poKeyword) {
      query = query.ilike("po_number", `%${poKeyword}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    let rows = data ?? [];
    if (vendorKeyword) {
      const lower = vendorKeyword.toLowerCase();
      rows = rows.filter((r) => {
        const v = r.vendors as { name?: string } | null;
        return v?.name?.toLowerCase().includes(lower);
      });
    }

    return {
      ok: true,
      count: rows.length,
      truncated: rows.length === LIMIT,
      since: since.toISOString().slice(0, 10),
      orders: rows.map((r) => {
        const items = (r.purchase_order_items ??
          []) as unknown as Array<{
          ordered_quantity: number;
          received_quantity: number;
          unit_price: number;
        }>;
        const totalAmount = items.reduce(
          (sum, it) => sum + it.ordered_quantity * (it.unit_price ?? 0),
          0,
        );
        const totalOrdered = items.reduce(
          (sum, it) => sum + it.ordered_quantity,
          0,
        );
        const totalReceived = items.reduce(
          (sum, it) => sum + it.received_quantity,
          0,
        );
        const v = r.vendors as
          | { name?: string; contact_person?: string | null }
          | null;
        return {
          id: r.id,
          po_number: r.po_number,
          status: r.status,
          order_date: r.order_date,
          due_date: r.due_date ?? null,
          sent_at: r.sent_at?.slice(0, 10) ?? null,
          completed_at: r.completed_at?.slice(0, 10) ?? null,
          vendor: v?.name ?? null,
          vendor_contact: v?.contact_person ?? null,
          ship_to: r.ship_to ?? null,
          item_count: items.length,
          total_ordered: totalOrdered,
          total_received: totalReceived,
          total_amount: totalAmount,
        };
      }),
    };
  },
};
