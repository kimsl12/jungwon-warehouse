"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import {
  deleteVendorPrice,
  upsertVendorPrice,
  type PriceFormState,
} from "@/app/(dashboard)/vendors/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

type PriceRow = {
  id: string;
  unit_price: number;
  note: string | null;
  product: {
    id: string;
    name: string;
    variant: string | null;
    unit: string | null;
    category: string | null;
  } | null;
};

type ProductOption = {
  id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  category: string | null;
};

export function VendorPricesEditor({
  vendorId,
  prices,
}: {
  vendorId: string;
  prices: PriceRow[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ProductOption | null>(null);
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<PriceFormState>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const supabase = createBrowserClient();
      const { data } = await supabase
        .rpc("search_products", { p_query: query })
        .select("id, name, variant, unit, category")
        .limit(10);
      setResults((data ?? []) as ProductOption[]);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function handlePick(p: ProductOption) {
    setSelected(p);
    setQuery("");
    setResults([]);
    // 기존 등록된 단가가 있으면 폼에 채움 (수정 편의)
    const existing = prices.find((row) => row.product?.id === p.id);
    if (existing) {
      setUnitPrice(String(existing.unit_price));
      setNote(existing.note ?? "");
    } else {
      setUnitPrice("");
      setNote("");
    }
  }

  function handleSubmit(formData: FormData) {
    if (!selected) return;
    setState(null);
    formData.set("vendor_id", vendorId);
    formData.set("product_id", selected.id);
    startTransition(async () => {
      const result = await upsertVendorPrice(null, formData);
      if (result?.success) {
        setSelected(null);
        setUnitPrice("");
        setNote("");
        setState(null);
      } else {
        setState(result);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("이 단가를 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteVendorPrice(fd);
    });
  }

  const nf = new Intl.NumberFormat("ko-KR");

  return (
    <div className="space-y-6">
      {/* 단가 추가/수정 폼 */}
      <div className="rounded border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> 단가 추가 · 수정
        </h4>

        {!selected ? (
          <div className="space-y-1.5">
            <Label>품목 검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제품명·별칭으로 검색..."
                className="w-full rounded bg-surface-highest py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-secondary/20"
              />
            </div>
            {results.length > 0 && (
              <div className="rounded border bg-background max-h-56 overflow-y-auto">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePick(p)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-low transition-colors border-b last:border-b-0"
                  >
                    <p className="text-sm font-medium">
                      {p.name}
                      {p.variant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {p.variant}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.category ?? "분류 없음"}</p>
                  </button>
                ))}
              </div>
            )}
            {query.length > 0 && results.length === 0 && !searching && (
              <p className="text-xs text-muted-foreground px-1">검색 결과 없음</p>
            )}
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-3">
            <div className="rounded bg-surface-low p-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">
                  {selected.name}
                  {selected.variant && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {selected.variant}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.category ?? "분류 없음"}
                  {selected.unit && <span className="ml-2">단위: {selected.unit}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelected(null); setUnitPrice(""); setNote(""); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                변경
              </button>
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price-input">
                  단가 (원) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price-input"
                  name="unit_price"
                  type="number"
                  min={0}
                  step={1}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  disabled={isPending}
                  required
                  placeholder="0"
                />
                {state?.fieldErrors?.unit_price?.[0] && (
                  <p className="text-xs text-destructive">{state.fieldErrors.unit_price[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price-note">메모 (선택)</Label>
                <Input
                  id="price-note"
                  name="note"
                  type="text"
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isPending}
                  placeholder="단가 조건 메모"
                />
              </div>
            </div>

            {state?.error && (
              <p className="text-sm text-destructive" role="alert">{state.error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)} disabled={isPending}>
                취소
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 등록된 단가 목록 */}
      {prices.length === 0 ? (
        <div className="rounded border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">등록된 단가가 없습니다.</p>
          <p className="text-xs text-muted-foreground mt-1">
            위 검색으로 품목을 골라 단가를 등록하세요.
          </p>
        </div>
      ) : (
        <div className="rounded border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_140px_1fr_60px] gap-3 px-4 py-2.5 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span>품목</span>
            <span>분류</span>
            <span className="text-right">단가 (원)</span>
            <span>메모</span>
            <span />
          </div>
          {prices.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_120px_140px_1fr_60px] gap-3 items-center px-4 py-2.5 border-t hover:bg-surface-low/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {row.product?.name ?? "—"}
                  {row.product?.variant && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      · {row.product.variant}
                    </span>
                  )}
                </p>
                {row.product?.unit && (
                  <p className="text-xs text-muted-foreground">단위: {row.product.unit}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate">{row.product?.category ?? "—"}</span>
              <span className="text-right text-sm font-bold tabular-nums">
                {nf.format(row.unit_price)}
              </span>
              <span className="text-xs text-muted-foreground truncate">{row.note ?? "—"}</span>
              <button
                onClick={() => handleDelete(row.id)}
                className="justify-self-end p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="삭제"
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
