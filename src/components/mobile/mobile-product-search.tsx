"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

/**
 * Debounced search box for /m/scan. Updates the URL `q` param so the
 * server component re-fetches matching products.
 */
export function MobileProductSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      router.replace(`/m/scan?${params.toString()}`);
    }, 250);
    return () => clearTimeout(handle);
    // Only react to value changes — searchParams/router are stable enough
    // to avoid an infinite loop with useRouter.replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="search"
      inputMode="search"
      placeholder="제품명 검색"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="h-11 text-base"
    />
  );
}
