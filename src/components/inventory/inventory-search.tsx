"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  // Debounce search input by 300ms
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
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px] space-y-1.5">
        <Label htmlFor="search">검색</Label>
        <Input
          id="search"
          type="search"
          placeholder="제품명으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category-filter">분류</Label>
        <select
          id="category-filter"
          value={category}
          onChange={handleCategoryChange}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">전체</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {(search || category) && (
        <button
          type="button"
          onClick={handleReset}
          className="h-9 rounded-md border border-input px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          초기화
        </button>
      )}
    </div>
  );
}
