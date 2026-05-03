"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * 현장 테이블 행에서 정산서 PDF 발급을 위한 작은 메뉴.
 * - 월말 정산서: 해당 월 범위 지정 후 발급
 * - 준공 정산서: 비활성 현장의 전체 기간 (활성 현장은 경고)
 */
export function SiteStatementButton({
  siteId,
  siteActive,
}: {
  siteId: string;
  siteActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "monthly" | "completion">("menu");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));

  function reset() {
    setMode("menu");
  }

  function handleMonthlyIssue() {
    const y = Number.parseInt(year, 10);
    const m = Number.parseInt(month, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return;
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    // 말일: 다음 달 0일
    const last = new Date(y, m, 0);
    const lastStr = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    const url = `/api/pdf/site-statement/${siteId}?type=monthly&from=${first}&to=${lastStr}`;
    window.open(url, "_blank");
    setOpen(false);
    reset();
  }

  function handleCompletionIssue() {
    const url = `/api/pdf/site-statement/${siteId}?type=completion`;
    window.open(url, "_blank");
    setOpen(false);
    reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          reset();
        }}
        className="rounded bg-surface-low px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-high transition-colors"
      >
        정산서
      </button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            reset();
          }
        }}
      >
        <AlertDialogContent>
          {mode === "menu" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>정산서 발급</AlertDialogTitle>
                <AlertDialogDescription>
                  발급할 정산서 종류를 선택하세요.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMode("monthly")}
                  className="flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left hover:bg-surface-low transition-colors"
                >
                  <FileText className="h-5 w-5 shrink-0 text-secondary" />
                  <div>
                    <p className="text-sm font-semibold">월말 정산서</p>
                    <p className="text-xs text-muted-foreground">
                      특정 월의 출고 내역을 한 장에 집계
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("completion")}
                  className="flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left hover:bg-surface-low transition-colors"
                >
                  <FileText className="h-5 w-5 shrink-0 text-success" />
                  <div>
                    <p className="text-sm font-semibold">준공 정산서</p>
                    <p className="text-xs text-muted-foreground">
                      현장 전체 기간의 출고 내역을 한 장에 집계
                      {siteActive && " (현재 활성 상태)"}
                    </p>
                  </div>
                </button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>닫기</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}

          {mode === "monthly" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>월말 정산서 — 기간 선택</AlertDialogTitle>
                <AlertDialogDescription>
                  발급할 대상 월을 선택하세요.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">년</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min={2020}
                    max={2100}
                    className="mt-1 h-10 w-full rounded border bg-background px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">월</label>
                  <input
                    type="number"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    min={1}
                    max={12}
                    className="mt-1 h-10 w-full rounded border bg-background px-3 text-sm tabular-nums"
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("menu")}
                >
                  뒤로
                </Button>
                <AlertDialogAction onClick={handleMonthlyIssue}>
                  PDF 발급
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {mode === "completion" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>준공 정산서 발급</AlertDialogTitle>
                <AlertDialogDescription>
                  {siteActive ? (
                    <>
                      이 현장은 아직 <b>활성 상태</b>입니다. 준공 정산서는 보통 현장 비활성화
                      시점에 발급하는 것이 정확합니다. 그래도 발급하시겠습니까?
                    </>
                  ) : (
                    <>
                      이 현장의 전체 기간(최초 출고 ~ 비활성화 시점) 출고 내역을 PDF로
                      발급합니다.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("menu")}
                >
                  뒤로
                </Button>
                <AlertDialogAction onClick={handleCompletionIssue}>
                  PDF 발급
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
