"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { searchProductsForRequest } from "@/app/(mobile)/m/request/actions";

export type PickerProduct = {
  id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  quantity: number;
  available: number;
};

type Props = {
  onPick: (product: PickerProduct) => void;
  disabled?: boolean;
};

export function TemplateProductPicker({ onPick, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const rows = await searchProductsForRequest(trimmed);
      setResults(rows);
      setSearching(false);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border bg-background py-2 pl-9 pr-3 text-sm"
        placeholder="자재 이름으로 검색"
        disabled={disabled}
      />
      {query.trim().length > 0 && (
        <div className="absolute z-10 mt-1 max-h-[60vh] w-full overflow-y-auto rounded border bg-background shadow-lg">
          {searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">검색 중...</p>
          )}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick(p);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full items-start justify-between gap-2 border-b px-3 py-2 text-left hover:bg-surface-low last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {p.name}
                  {p.variant && (
                    <span className="ml-1 text-muted-foreground">· {p.variant}</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  가용 {p.available}
                  {p.unit ?? ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
