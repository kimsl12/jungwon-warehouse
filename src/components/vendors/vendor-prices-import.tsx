"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";

import {
  bulkUpsertVendorPrices,
  type BulkUpsertResult,
} from "@/app/(dashboard)/vendors/[id]/actions";
import { Button } from "@/components/ui/button";

/**
 * 거래처 상세 페이지 내 CSV 일괄 업로드 섹션.
 *
 * 기대 CSV:
 *   제품명, 변형, 단가, 비고   (변형·비고는 선택)
 *
 * 내부적으로 (제품명, 변형) 조합으로 products 1건을 매칭해 단가를 upsert.
 */
export function VendorPricesImport({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkUpsertResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setResult(null);

    if (file.size > 5 * 1024 * 1024) {
      setError("파일 크기가 너무 큽니다 (최대 5MB).");
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("파일을 읽을 수 없습니다.");
      return;
    }

    startTransition(async () => {
      const res = await bulkUpsertVendorPrices(vendorId, text);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="rounded border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" /> CSV 일괄 업로드
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            컬럼: <code>제품명, 단가</code> 필수 / <code>변형, 비고</code> 선택. 제품명·변형이
            재고 DB와 정확히 일치하는 품목만 등록됩니다.
          </p>
        </div>
        <label className="shrink-0">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            disabled={isPending}
            className="sr-only"
          />
          <span className="inline-flex items-center gap-1 rounded bg-surface-low px-3 py-1.5 text-xs font-medium hover:bg-surface-high cursor-pointer">
            <Upload className="h-3.5 w-3.5" /> 파일 선택
          </span>
        </label>
      </div>

      {isPending && (
        <p className="text-xs text-muted-foreground">파일 처리 중...</p>
      )}

      {error && (
        <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {result && !result.ok && (
        <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {result.error}
        </p>
      )}

      {result && result.ok && (
        <div className="rounded border bg-success-bg px-3 py-3 text-xs space-y-1.5 dark:bg-emerald-950/30">
          <p className="font-semibold text-success dark:text-emerald-300">
            완료 — 신규 {result.inserted}건 · 갱신 {result.updated}건 · 건너뜀 {result.skipped}건
          </p>
          {(result.warnings.length > 0 || result.matchWarnings.length > 0) && (
            <details className="text-muted-foreground">
              <summary className="cursor-pointer">경고 {result.warnings.length + result.matchWarnings.length}건 보기</summary>
              <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                {result.warnings.map((w, i) => <li key={`w${i}`}>{w}</li>)}
                {result.matchWarnings.map((w, i) => <li key={`m${i}`}>{w}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
