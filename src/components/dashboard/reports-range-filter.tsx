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

  // 자주 쓰는 기간 프리셋 — 매번 달력을 두 번 찍는 수고를 줄인다
  function applyPreset(preset: "thisMonth" | "lastMonth" | "last7") {
    const today = new Date();
    let start: Date;
    let end: Date;
    if (preset === "thisMonth") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
    } else if (preset === "lastMonth") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else {
      start = new Date(today);
      start.setDate(today.getDate() - 6);
      end = today;
    }
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const nextFrom = fmt(start);
    const nextTo = fmt(end);
    setFrom(nextFrom);
    setTo(nextTo);
    pushRange(nextFrom, nextTo);
  }

  const isCustomRange =
    from !== initialFrom ||
    to !== initialTo ||
    Boolean(searchParams.get("from")) ||
    Boolean(searchParams.get("to"));

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label
          htmlFor="reports-from"
          className="text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          시작일
        </Label>
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
        <Label
          htmlFor="reports-to"
          className="text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          종료일
        </Label>
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
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => applyPreset("thisMonth")}
          className="h-9 rounded-md border border-input px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          이번 달
        </button>
        <button
          type="button"
          onClick={() => applyPreset("lastMonth")}
          className="h-9 rounded-md border border-input px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          지난 달
        </button>
        <button
          type="button"
          onClick={() => applyPreset("last7")}
          className="h-9 rounded-md border border-input px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          최근 7일
        </button>
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
