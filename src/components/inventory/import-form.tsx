"use client";

import { useState, useTransition } from "react";

import { commitImportAndRedirect, previewImport, type ImportPreview } from "@/app/(dashboard)/inventory/import/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ImportForm() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParse] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreview(null);

    // Read text on the client too so we can stash it for the commit step.
    try {
      const text = await file.text();
      setCsvText(text);
    } catch {
      setError("파일을 읽을 수 없습니다.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    startParse(async () => {
      const result = await previewImport(fd);
      if (!result.ok) {
        setError(result.error);
        setPreview(null);
        return;
      }
      setPreview(result);
    });
  }

  function handleReset() {
    setPreview(null);
    setCsvText("");
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. 파일 업로드</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={isParsing}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
        />
        {isParsing && <p className="text-xs text-muted-foreground">파일을 분석하는 중...</p>}
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {preview && preview.ok && (
          <PreviewSection preview={preview} csvText={csvText} onReset={handleReset} />
        )}
      </CardContent>
    </Card>
  );
}

function PreviewSection({
  preview,
  csvText,
  onReset,
}: {
  preview: Extract<ImportPreview, { ok: true }>;
  csvText: string;
  onReset: () => void;
}) {
  const total = preview.rows.length;
  const existingCount = preview.existingNames.length;
  const newCount = total - existingCount;

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <h3 className="text-sm font-semibold">2. 미리보기</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          파싱된 행 {total.toLocaleString("ko-KR")}건 — 신규 {newCount.toLocaleString("ko-KR")}건,
          기존 제품명 {existingCount.toLocaleString("ko-KR")}건
        </p>
      </div>

      {preview.warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="mb-1 font-semibold">경고 ({preview.warnings.length}건)</p>
          <ul className="space-y-0.5">
            {preview.warnings.slice(0, 5).map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
            {preview.warnings.length > 5 && <li>• 외 {preview.warnings.length - 5}건</li>}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">행</th>
              <th className="px-2 py-1.5 text-left font-medium">제품명</th>
              <th className="px-2 py-1.5 text-left font-medium">분류</th>
              <th className="px-2 py-1.5 text-left font-medium">단위</th>
              <th className="px-2 py-1.5 text-right font-medium">수량</th>
              <th className="px-2 py-1.5 text-right font-medium">최소</th>
              <th className="px-2 py-1.5 text-left font-medium">위치</th>
              <th className="px-2 py-1.5 text-left font-medium">별칭</th>
              <th className="px-2 py-1.5 text-left font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.slice(0, 30).map((r) => {
              const isExisting = preview.existingNames.includes(r.name);
              return (
                <tr key={r.lineNumber} className="border-t">
                  <td className="px-2 py-1 text-muted-foreground">{r.lineNumber}</td>
                  <td className="px-2 py-1 font-medium">{r.name}</td>
                  <td className="px-2 py-1 text-muted-foreground">{r.category ?? "—"}</td>
                  <td className="px-2 py-1 text-muted-foreground">{r.unit ?? "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{r.quantity}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                    {r.min_quantity}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">{r.location ?? "—"}</td>
                  <td className="px-2 py-1 text-muted-foreground">{r.aliases.length > 0 ? r.aliases.join(", ") : "—"}</td>
                  <td className="px-2 py-1">
                    {isExisting ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        기존
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        신규
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {total > 30 && (
          <p className="border-t bg-muted/20 px-2 py-1.5 text-center text-xs text-muted-foreground">
            상위 30행만 표시 — 전체 {total.toLocaleString("ko-KR")}행
          </p>
        )}
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">3. 처리 방식 선택 후 확정</h3>
        <p className="text-xs text-muted-foreground">
          기존 제품명이 있는 경우의 처리 방식을 선택하세요.
        </p>

        <form action={commitImportAndRedirect} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="csv" value={csvText} />
          <Button type="submit" name="mode" value="skip" variant="outline" size="sm">
            건너뛰기로 등록
          </Button>
          <Button type="submit" name="mode" value="overwrite" size="sm">
            덮어쓰기로 등록
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            다시 선택
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground">
          • 건너뛰기: 같은 제품명이 있으면 그 행은 무시합니다.
          <br />• 덮어쓰기: 같은 제품명의 분류/단위/위치/최소수량을 업데이트합니다 (수량은 변경
          안 함).
        </p>
      </div>
    </div>
  );
}
