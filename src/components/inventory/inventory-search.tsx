"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";

export function InventorySearch({
  categories,
  initialSearch,
  initialCategory,
}: {
  categories: string[];
  initialSearch: string;
  initialCategory: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);

  useEffect(() => {
    if (search === initialSearch) return;
    const t = setTimeout(() => {
      pushParams({ q: search, page: "1" });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    startTransition(() => {
      router.push(`/inventory?${params.toString()}`);
    });
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCategory(e.target.value);
    pushParams({ category: e.target.value, page: "1" });
  }

  function handleReset() {
    setSearch("");
    setCategory("");
    startTransition(() => {
      router.push("/inventory");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input — recessed look */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="제품명 또는 별칭으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded bg-surface-highest py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
        />
      </div>
      {/* Category filter */}
      <select
        value={category}
        onChange={handleCategoryChange}
        className="rounded bg-surface-highest py-2.5 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
      >
        <option value="">전체 분류</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {(search || category) && (
        <button
          type="button"
          onClick={handleReset}
          className="rounded bg-surface-high px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-surface-highest transition-colors"
        >
          초기화
        </button>
      )}
    </div>
  );
}
