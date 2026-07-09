"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";

import {
  processTransaction,
  type ProcessTransactionState,
} from "@/app/(dashboard)/inventory/transaction-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

type SiteOption = { id: string; name: string };
type ProductOption = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  variant: string | null;
  quantity: number;
};

export function QuickTransactionDialog({
  type,
  open,
  onOpenChange,
  sites,
}: {
  type: "in" | "out";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: SiteOption[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [selected, setSelected] = useState<ProductOption | null>(null);
  const [siteId, setSiteId] = useState("");
  const [state, setState] = useState<ProcessTransactionState>(null);
  const [isPending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);

  // Debounced product search — setState 는 모두 debounce 콜백 안에서만 수행
  useEffect(() => {
    const t = setTimeout(
      async () => {
        if (query.length < 1) {
          setResults([]);
          setSearching(false);
          return;
        }
        setSearching(true);
        const supabase = createBrowserClient();
        const { data } = await supabase
          .rpc("search_products", { p_query: query })
          .select("id, name, category, unit, variant, quantity")
          .limit(200);
        setResults(data ?? []);
        setSearching(false);
      },
      query.length < 1 ? 0 : 250,
    );
    return () => clearTimeout(t);
  }, [query]);

  function handleSelect(product: ProductOption) {
    setSelected(product);
    setQuery("");
    setResults([]);
  }

  function handleSubmit(formData: FormData) {
    if (!selected) return;
    setState(null);
    formData.set("product_id", selected.id);
    formData.set("type", type);
    formData.set("site_id", siteId);
    startTransition(async () => {
      const result = await processTransaction(null, formData);
      if (result?.success) {
        // 즉시 닫고 토스트로 알림 — 반복 작업 속도 우선
        toast.success(
          `${type === "in" ? "입고" : "출고"} 처리 완료 — ${selected.name}`,
        );
        if (result.lowStock) {
          toast.warning(`${selected.name} 재고가 최소 수량 이하입니다.`);
        }
        onOpenChange(false);
        reset();
        return;
      }
      setState(result);
    });
  }

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setSiteId("");
    setState(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  const title = type === "in" ? "입고 처리" : "출고 처리";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="grid gap-4">
            {/* Product search or selected display */}
            {selected ? (
              <div className="rounded bg-surface-low p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {selected.name}
                      {selected.variant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {selected.variant}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selected.category ?? ""} · 현재{" "}
                      {selected.quantity.toLocaleString("ko-KR")}
                      {selected.unit ? ` ${selected.unit}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    변경
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>품목 검색</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="제품명 또는 별칭..."
                    className="w-full rounded bg-surface-highest py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-secondary/20"
                    autoFocus
                  />
                </div>
                {results.length > 0 && (
                  <div
                    className="rounded bg-card max-h-96 overflow-y-auto"
                    style={{ boxShadow: "0 20px 40px rgba(27,28,27,0.06)" }}
                  >
                    {results.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect(p)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-low transition-colors"
                      >
                        <p className="text-sm font-medium">
                          {p.name}
                          {p.variant && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              · {p.variant}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.category ?? ""} ·{" "}
                          {p.quantity.toLocaleString("ko-KR")}
                          {p.unit ?? ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {query.length > 0 && results.length === 0 && !searching && (
                  <p className="text-xs text-muted-foreground px-1">
                    검색 결과 없음
                  </p>
                )}
              </div>
            )}

            {selected && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="qty">
                    수량 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="qty"
                    name="quantity"
                    type="number"
                    min={1}
                    required
                    disabled={isPending}
                  />
                  {state?.fieldErrors?.quantity?.[0] && (
                    <p className="text-xs text-destructive">
                      {state.fieldErrors.quantity[0]}
                    </p>
                  )}
                </div>

                {type === "out" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="site">
                      현장 <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="site"
                      className="w-full rounded bg-surface-highest py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-secondary/20"
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value)}
                      required
                      disabled={isPending}
                    >
                      <option value="">— 현장 선택 —</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {state?.fieldErrors?.site_id?.[0] && (
                      <p className="text-xs text-destructive">
                        {state.fieldErrors.site_id[0]}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="note">메모 (선택)</Label>
                  <Input
                    id="note"
                    name="note"
                    type="text"
                    maxLength={500}
                    disabled={isPending}
                  />
                </div>
              </>
            )}
          </div>

          {state?.error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          {state?.success && (
            <div className="mt-3 rounded bg-success-bg p-3 text-sm">
              <p className="font-medium text-success">
                처리 완료 · 새 수량 {state.newQuantity?.toLocaleString("ko-KR")}
              </p>
              {state.lowStock && (
                <p className="mt-1 text-xs text-destructive">
                  최소 재고 이하 — 추가 입고 필요
                </p>
              )}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              닫기
            </Button>
            <Button type="submit" disabled={isPending || !selected}>
              {isPending ? "처리 중..." : title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
