"use client";

import { useEffect, useState, useTransition } from "react";

import {
  addAlias,
  fetchAliases,
  removeAlias,
} from "@/app/(dashboard)/inventory/alias-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AliasRow = { id: string; alias: string };

export function ProductAliases({ productId }: { productId: string }) {
  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAliases(productId).then((data) => {
      if (!cancelled) {
        setAliases(data);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [productId]);

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await addAlias(productId, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInput("");
      const updated = await fetchAliases(productId);
      setAliases(updated);
    });
  }

  function handleRemove(aliasId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeAlias(aliasId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAliases((prev) => prev.filter((a) => a.id !== aliasId));
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-1.5">
        <Label>별칭 (검색용)</Label>
        <p className="text-xs text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>별칭 (검색용)</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="별칭 입력 후 Enter"
          disabled={isPending}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !input.trim()}
        >
          추가
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {aliases.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
            >
              {a.alias}
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                disabled={isPending}
                className="ml-0.5 text-muted-foreground hover:text-destructive"
                aria-label={`별칭 "${a.alias}" 삭제`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        별칭을 등록하면 재고 검색 시 별칭으로도 품목을 찾을 수 있습니다.
      </p>
    </div>
  );
}
