"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string | null };
type Initial = {
  type: string;
  product_id: string;
  user_id: string;
  category: string;
  site_id: string;
  vendor_id: string;
  from: string;
  to: string;
};

export function TransactionsFilters({
  products,
  categories,
  profiles,
  sites,
  vendors,
  initial,
}: {
  products: Option[];
  categories: string[];
  profiles: Option[];
  sites: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  initial: Initial;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<Initial>(initial);

  function update<K extends keyof Initial>(key: K, value: Initial[K]) {
    const next = { ...state, [key]: value };
    setState(next);
    pushParams({ [key]: value, page: "" });
  }

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => {
      router.push(`/transactions?${params.toString()}`);
    });
  }

  function handleReset() {
    setState({ type: "", product_id: "", user_id: "", category: "", site_id: "", vendor_id: "", from: "", to: "" });
    startTransition(() => router.push("/transactions"));
  }

  const hasFilter =
    state.type || state.product_id || state.user_id || state.category || state.site_id || state.vendor_id || state.from || state.to;

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="type">구분</Label>
          <select
            id="type"
            className={selectClass}
            value={state.type}
            onChange={(e) => update("type", e.target.value)}
          >
            <option value="">전체</option>
            <option value="in">입고</option>
            <option value="out">출고</option>
            <option value="loss">분실</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category-tx">분류</Label>
          <select
            id="category-tx"
            className={selectClass}
            value={state.category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">전체</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="product-tx">품목</Label>
          <select
            id="product-tx"
            className={selectClass}
            value={state.product_id}
            onChange={(e) => update("product_id", e.target.value)}
          >
            <option value="">전체</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-tx">담당자</Label>
          <select
            id="user-tx"
            className={selectClass}
            value={state.user_id}
            onChange={(e) => update("user_id", e.target.value)}
          >
            <option value="">전체</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? "(이름 없음)"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="site-tx">현장</Label>
          <select
            id="site-tx"
            className={selectClass}
            value={state.site_id}
            onChange={(e) => update("site_id", e.target.value)}
          >
            <option value="">전체</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vendor-tx">거래처 (입고만 매칭)</Label>
          <select
            id="vendor-tx"
            className={selectClass}
            value={state.vendor_id}
            onChange={(e) => update("vendor_id", e.target.value)}
          >
            <option value="">전체</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="from">시작일</Label>
          <Input
            id="from"
            type="date"
            value={state.from}
            onChange={(e) => update("from", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="to">종료일</Label>
          <Input
            id="to"
            type="date"
            value={state.to}
            onChange={(e) => update("to", e.target.value)}
          />
        </div>
      </div>

      {hasFilter && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            필터 초기화
          </button>
        </div>
      )}
    </div>
  );
}
