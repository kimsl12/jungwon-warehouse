"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import {
  createPurchaseOrder,
  type PoFormState,
} from "@/app/(dashboard)/purchase-orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { DELIVERY_TERMS, INSPECTION_TERMS, PAYMENT_TERMS } from "@/lib/po-options";

type VendorOption = {
  id: string;
  name: string;
  fax: string | null;
  email: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  subcategory: string | null;
};

type LineItem = {
  key: string;
  product_id: string;
  product_name: string;
  product_variant: string | null;
  spec: string | null;
  unit: string | null;
  ordered_quantity: number;
  unit_price: number;
  note: string;
};

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function PurchaseOrderForm({ vendors }: { vendors: VendorOption[] }) {
  const router = useRouter();
  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(todayYmd());
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [inspectionTerms, setInspectionTerms] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [shipToContact, setShipToContact] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [vendorPriceMap, setVendorPriceMap] = useState<Map<string, number>>(new Map());

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);

  const [state, setState] = useState<PoFormState>(null);
  const [isPending, startTransition] = useTransition();

  const selectedVendor = vendors.find((v) => v.id === vendorId);

  // 거래처 선택이 바뀌면 해당 거래처의 등록 단가 맵 로드
  useEffect(() => {
    if (!vendorId) { setVendorPriceMap(new Map()); return; }
    const supabase = createBrowserClient();
    supabase
      .from("vendor_product_prices")
      .select("product_id, unit_price")
      .eq("vendor_id", vendorId)
      .then(({ data }) => {
        const map = new Map<string, number>();
        for (const row of data ?? []) map.set(row.product_id, row.unit_price);
        setVendorPriceMap(map);
        // 이미 담긴 품목들의 단가 갱신
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            unit_price: map.get(it.product_id) ?? it.unit_price,
          })),
        );
      });
  }, [vendorId]);

  // 품목 검색
  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const supabase = createBrowserClient();
      const { data } = await supabase
        .rpc("search_products", { p_query: query })
        .select("id, name, variant, unit, subcategory")
        .limit(10);
      setResults((data ?? []) as ProductOption[]);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function addItem(p: ProductOption) {
    // 중복 방지: 이미 담긴 같은 product_id 있으면 수량 +1
    const existing = items.find((it) => it.product_id === p.id);
    if (existing) {
      setItems((prev) =>
        prev.map((it) =>
          it.product_id === p.id ? { ...it, ordered_quantity: it.ordered_quantity + 1 } : it,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          product_id: p.id,
          product_name: p.name,
          product_variant: p.variant,
          spec: p.subcategory ?? null,
          unit: p.unit,
          ordered_quantity: 1,
          unit_price: vendorPriceMap.get(p.id) ?? 0,
          note: "",
        },
      ]);
    }
    setQuery("");
    setResults([]);
  }

  function updateItem<K extends keyof LineItem>(key: string, field: K, value: LineItem[K]) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const nf = new Intl.NumberFormat("ko-KR");
  const totalSupply = items.reduce((s, it) => s + it.ordered_quantity * it.unit_price, 0);
  const totalTax = Math.round(totalSupply * 0.1);
  const totalWithTax = totalSupply + totalTax;

  function submit(status: "draft" | "sent") {
    setState(null);
    startTransition(async () => {
      const result = await createPurchaseOrder({
        vendor_id: vendorId,
        order_date: orderDate,
        due_date: dueDate || undefined,
        payment_terms: paymentTerms,
        delivery_terms: deliveryTerms,
        inspection_terms: inspectionTerms,
        ship_to: shipTo,
        ship_to_contact: shipToContact,
        note,
        status,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_variant: it.product_variant,
          spec: it.spec,
          unit: it.unit,
          ordered_quantity: it.ordered_quantity,
          unit_price: it.unit_price,
          note: it.note,
        })),
      });
      if (result?.success && result.po_id) {
        router.push(`/purchase-orders/${result.po_id}`);
      } else {
        setState(result);
      }
    });
  }

  const selectCls =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <section className="rounded bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">기본 정보</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="po-vendor">거래처 <span className="text-destructive">*</span></Label>
            <select
              id="po-vendor"
              className={selectCls}
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              required
              disabled={isPending}
            >
              <option value="">— 선택 —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {state?.fieldErrors?.vendor_id?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.vendor_id[0]}</p>
            )}
            {selectedVendor && (
              <p className="text-[11px] text-muted-foreground">
                팩스: {selectedVendor.fax ?? "—"} / 이메일: {selectedVendor.email ?? "—"}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-order-date">작성일</Label>
            <Input
              id="po-order-date"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-due-date">납기일 (선택)</Label>
            <Input
              id="po-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
      </section>

      {/* 품목 */}
      <section className="rounded bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> 발주 품목
        </h3>

        {/* 품목 검색 */}
        <div className="space-y-1.5">
          <Label>품목 추가</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제품명·별칭으로 검색..."
              className="w-full rounded bg-surface-highest py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-secondary/20"
              disabled={isPending}
            />
          </div>
          {results.length > 0 && (
            <div className="rounded border bg-background max-h-56 overflow-y-auto">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addItem(p)}
                  className="w-full text-left px-3 py-2 hover:bg-surface-low transition-colors border-b last:border-b-0 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {p.name}
                      {p.variant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {p.variant}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.subcategory ?? "규격 없음"} {p.unit && `· ${p.unit}`}</p>
                  </div>
                  {vendorPriceMap.get(p.id) !== undefined && (
                    <span className="text-xs tabular-nums text-emerald-700">
                      등록 단가 {nf.format(vendorPriceMap.get(p.id)!)}원
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {query.length > 0 && results.length === 0 && !searching && (
            <p className="text-xs text-muted-foreground px-1">검색 결과 없음</p>
          )}
        </div>

        {/* 선택된 라인 */}
        {items.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">아직 추가된 품목이 없습니다.</p>
          </div>
        ) : (
          <div className="rounded border overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_60px_90px_100px_100px_1fr_40px] gap-2 px-3 py-2 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>품목</span>
              <span>규격</span>
              <span>단위</span>
              <span className="text-right">수량</span>
              <span className="text-right">단가</span>
              <span className="text-right">공급가액</span>
              <span>비고</span>
              <span />
            </div>
            {items.map((it) => {
              const supply = it.ordered_quantity * it.unit_price;
              return (
                <div
                  key={it.key}
                  className="grid grid-cols-[1fr_100px_60px_90px_100px_100px_1fr_40px] gap-2 items-center px-3 py-2 border-t"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {it.product_name}
                      {it.product_variant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {it.product_variant}</span>
                      )}
                    </p>
                  </div>
                  <Input
                    type="text"
                    value={it.spec ?? ""}
                    onChange={(e) => updateItem(it.key, "spec", e.target.value)}
                    className="h-8 text-xs"
                    disabled={isPending}
                  />
                  <span className="text-xs text-muted-foreground">{it.unit ?? "—"}</span>
                  <Input
                    type="number"
                    min={1}
                    value={it.ordered_quantity}
                    onChange={(e) => updateItem(it.key, "ordered_quantity", Math.max(1, Number(e.target.value) || 1))}
                    className="h-8 text-right tabular-nums text-xs"
                    disabled={isPending}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={it.unit_price}
                    onChange={(e) => updateItem(it.key, "unit_price", Math.max(0, Number(e.target.value) || 0))}
                    className="h-8 text-right tabular-nums text-xs"
                    disabled={isPending}
                  />
                  <span className="text-right text-xs font-semibold tabular-nums">
                    {nf.format(supply)}
                  </span>
                  <Input
                    type="text"
                    value={it.note}
                    onChange={(e) => updateItem(it.key, "note", e.target.value)}
                    placeholder="비고"
                    className="h-8 text-xs"
                    maxLength={200}
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    className="justify-self-end p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label="삭제"
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {/* Totals */}
            <div className="grid grid-cols-[1fr_100px_60px_90px_100px_100px_1fr_40px] gap-2 items-center px-3 py-2 border-t bg-surface-low font-semibold text-xs">
              <span className="col-span-5 text-right">공급가액 합계</span>
              <span className="text-right tabular-nums">{nf.format(totalSupply)}</span>
              <span />
              <span />
            </div>
            <div className="grid grid-cols-[1fr_100px_60px_90px_100px_100px_1fr_40px] gap-2 items-center px-3 py-2 bg-surface-low text-xs">
              <span className="col-span-5 text-right text-muted-foreground">세액 (10%)</span>
              <span className="text-right tabular-nums">{nf.format(totalTax)}</span>
              <span />
              <span />
            </div>
            <div className="grid grid-cols-[1fr_100px_60px_90px_100px_100px_1fr_40px] gap-2 items-center px-3 py-2 bg-foreground text-background font-bold text-sm">
              <span className="col-span-5 text-right">합계 (부가세 포함)</span>
              <span className="text-right tabular-nums">{nf.format(totalWithTax)}</span>
              <span />
              <span />
            </div>
          </div>
        )}
        {state?.fieldErrors?.items?.[0] && (
          <p className="text-xs text-destructive">{state.fieldErrors.items[0]}</p>
        )}
      </section>

      {/* 조건/비고 */}
      <section className="rounded bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">거래 조건 · 배송지 · 비고</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="po-payment">결제조건</Label>
            <select
              id="po-payment"
              className={selectCls}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              disabled={isPending}
            >
              <option value="">— 미선택 —</option>
              {PAYMENT_TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-delivery">인도조건</Label>
            <select
              id="po-delivery"
              className={selectCls}
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              disabled={isPending}
            >
              <option value="">— 미선택 —</option>
              {DELIVERY_TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-inspection">검수조건</Label>
            <select
              id="po-inspection"
              className={selectCls}
              value={inspectionTerms}
              onChange={(e) => setInspectionTerms(e.target.value)}
              disabled={isPending}
            >
              <option value="">— 미선택 —</option>
              {INSPECTION_TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="po-ship-to">배송지 (선택)</Label>
            <Input
              id="po-ship-to"
              value={shipTo}
              onChange={(e) => setShipTo(e.target.value)}
              disabled={isPending}
              placeholder="직접 입력"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-ship-to-contact">받는이 (선택)</Label>
            <Input
              id="po-ship-to-contact"
              value={shipToContact}
              onChange={(e) => setShipToContact(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="po-note">비고 (선택)</Label>
          <Input
            id="po-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            disabled={isPending}
          />
        </div>
      </section>

      {/* 하단 액션 */}
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">{state.error}</p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => submit("draft")}
          disabled={isPending || !vendorId || items.length === 0}
        >
          {isPending ? "저장 중..." : "작성중으로 저장"}
        </Button>
        <Button
          type="button"
          onClick={() => submit("sent")}
          disabled={isPending || !vendorId || items.length === 0}
        >
          {isPending ? "저장 중..." : "발송 상태로 저장"}
        </Button>
      </div>
    </div>
  );
}
