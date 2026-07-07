"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Download, Search, Upload } from "lucide-react";

import { ProductCreateDialog } from "@/components/inventory/product-create-dialog";
import { cn } from "@/lib/utils";

const VISIBLE_CHIPS = 6;

export function InventoryToolbar({
  categories,
  initialSearch,
  initialCategory,
  isAdmin,
  initialIncludeInactive = false,
}: {
  categories: string[];
  initialSearch: string;
  initialCategory: string;
  isAdmin: boolean;
  initialIncludeInactive?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (search === initialSearch) return;
    const t = setTimeout(() => pushParams({ q: search, page: "1" }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => router.push(`/inventory?${params.toString()}`));
  }

  const visibleCats = categories.slice(0, VISIBLE_CHIPS);
  const hasOverflow = categories.length > VISIBLE_CHIPS;
  const overflowSelected =
    initialCategory && !visibleCats.includes(initialCategory);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-[320px] sm:w-[280px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="제품명·별칭 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted p-1">
        <button
          type="button"
          onClick={() => pushParams({ category: "", page: "1" })}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
            initialCategory === ""
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          전체
        </button>
        {visibleCats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pushParams({ category: c, page: "1" })}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              initialCategory === c
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
        {hasOverflow && (
          <select
            value={overflowSelected ? initialCategory : ""}
            onChange={(e) =>
              pushParams({ category: e.target.value, page: "1" })
            }
            className={cn(
              "rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none",
              overflowSelected
                ? "bg-card text-foreground shadow-xs"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <option value="">기타…</option>
            {categories.slice(VISIBLE_CHIPS).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {isAdmin && (
        <button
          type="button"
          onClick={() =>
            pushParams({
              inactive: initialIncludeInactive ? "" : "1",
              page: "1",
            })
          }
          className={cn(
            "h-9 rounded-md border px-3 text-xs font-medium transition-colors",
            initialIncludeInactive
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:bg-muted",
          )}
        >
          단종 포함
        </button>
      )}

      <div className="flex flex-1 justify-end gap-2">
        <Link
          href="/api/export/products"
          prefetch={false}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Download className="size-3.5" />
          내보내기
        </Link>
        {isAdmin && (
          <Link
            href="/inventory/import"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Upload className="size-3.5" />
            가져오기
          </Link>
        )}
        {isAdmin && <ProductCreateDialog />}
      </div>
    </div>
  );
}
