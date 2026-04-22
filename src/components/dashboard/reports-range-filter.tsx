"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReportsRangeFilter({
  initialFrom,
  initialTo,
}: {
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  function pushRange(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/reports?${qs}` : "/reports");
    });
  }

  function handleReset() {
    setFrom("");
    setTo("");
    startTransition(() => router.push("/reports"));
  }

  const isCustomRange = from !== initialFrom || to !== initialTo ||
    Boolean(searchParams.get("from")) || Boolean(searchParams.get("to"));

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="reports-from" className="text-[10px] uppercase tracking-widest text-muted-foreground">시작일</Label>
        <Input
          id="reports-from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => {
            const v = e.target.value;
            setFrom(v);
            pushRange(v, to);
          }}
          className="h-9 w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="reports-to" className="text-[10px] uppercase tracking-widest text-muted-foreground">종료일</Label>
        <Input
          id="reports-to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => {
            const v = e.target.value;
            setTo(v);
            pushRange(from, v);
          }}
          className="h-9 w-[150px]"
        />
      </div>
      {isCustomRange && (
        <button
          type="button"
          onClick={handleReset}
          className="h-9 rounded-md border border-input px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          기본(12개월)
        </button>
      )}
    </div>
  );
}
