"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import {
  recordStockAudit,
  searchProductsForAudit,
} from "@/app/(mobile)/m/audit/actions";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Candidate = {
  id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  quantity: number;
  category: string | null;
  location: string | null;
};

type RecentRow = {
  id: string;
  productName: string;
  productVariant: string | null;
  unit: string | null;
  dbQuantity: number;
  countedQuantity: number;
  difference: number;
  resolution: string;
  note: string | null;
  createdAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function MobileAuditSession({ recent }: { recent: RecentRow[] }) {
  const router = useRouter();

  // 검색
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isSearching, startSearch] = useTransition();

  // 선택된 제품 + 실사 입력
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [countedStr, setCountedStr] = useState("");
  const [note, setNote] = useState("");

  // 차이 있을 때 확인 다이얼로그
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDiff, setPendingDiff] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    if (!searchOpen) return;
    const handle = setTimeout(() => {
      if (query.trim().length === 0) {
        setCandidates([]);
        return;
      }
      startSearch(async () => {
        const results = await searchProductsForAudit(query);
        setCandidates(results);
      });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchOpen]);

  function resetForm() {
    setSelected(null);
    setCountedStr("");
    setNote("");
    setError(null);
  }

  function pickCandidate(c: Candidate) {
    setSelected(c);
    setCountedStr("");
    setNote("");
    setError(null);
    setSearchOpen(false);
  }

  function handleSubmit() {
    if (!selected) return;
    const counted = Number.parseInt(countedStr, 10);
    if (!Number.isFinite(counted) || counted < 0) {
      setError("수량은 0 이상의 숫자로 입력해주세요.");
      return;
    }
    setError(null);
    const diff = counted - selected.quantity;
    if (diff === 0) {
      // 차이 없음 → 그냥 자동 확정
      saveAudit("auto");
    } else {
      setPendingDiff(diff);
      setConfirmOpen(true);
    }
  }

  function saveAudit(mode: "auto" | "manual") {
    if (!selected) return;
    const counted = Number.parseInt(countedStr, 10);
    setError(null);
    startSave(async () => {
      const result = await recordStockAudit({
        product_id: selected.id,
        counted_quantity: counted,
        mode,
        note: note.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      resetForm();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* 제품 선택 */}
      {!selected ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setCandidates([]);
            setSearchOpen(true);
          }}
          className="flex min-h-[88px] w-full items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground active:bg-muted"
        >
          <Search className="h-4 w-4" />
          실사할 제품 검색
        </button>
      ) : (
        <div className="rounded-md border bg-background p-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">
                {selected.name}
                {selected.variant && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    · {selected.variant}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {selected.category ?? "분류 없음"}
                {selected.location && ` · 위치: ${selected.location}`}
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className="shrink-0 rounded p-1 text-muted-foreground active:bg-muted"
              aria-label="변경"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded bg-surface-low p-3 text-center">
            <p className="text-[11px] text-muted-foreground">시스템 재고</p>
            <p className="text-2xl font-bold tabular-nums">
              {selected.quantity.toLocaleString("ko-KR")}
              {selected.unit && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {selected.unit}
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="counted">
              실제 수량 <span className="text-destructive">*</span>
            </label>
            <input
              id="counted"
              type="number"
              inputMode="numeric"
              min={0}
              value={countedStr}
              onChange={(e) => setCountedStr(e.target.value)}
              disabled={isSaving}
              className="mt-1 h-12 w-full rounded border bg-background px-3 text-xl font-bold tabular-nums text-center"
              placeholder="0"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="audit-note">
              메모 (선택)
            </label>
            <input
              id="audit-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSaving}
              maxLength={300}
              placeholder="예: 박스 파손으로 2개 폐기"
              className="mt-1 h-10 w-full rounded border bg-background px-3 text-sm"
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || countedStr === ""}
            className="h-12 w-full text-base font-semibold"
          >
            {isSaving ? "처리 중..." : "실사 기록"}
          </Button>
        </div>
      )}

      {/* 최근 실사 */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          최근 실사 ({recent.length})
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
            최근 실사 기록이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {r.productName}
                      {r.productVariant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {r.productVariant}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                      {dateFormatter.format(new Date(r.createdAt))}
                    </p>
                    {r.note && (
                      <p className="mt-1 text-xs text-muted-foreground truncate">{r.note}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs tabular-nums">
                      <span className="text-muted-foreground">DB </span>
                      {r.dbQuantity.toLocaleString("ko-KR")}
                      <span className="text-muted-foreground"> → 실사 </span>
                      {r.countedQuantity.toLocaleString("ko-KR")}
                    </p>
                    {r.difference !== 0 && (
                      <p
                        className={
                          r.difference > 0
                            ? "text-[11px] font-semibold text-success"
                            : "text-[11px] font-semibold text-destructive"
                        }
                      >
                        차이 {r.difference > 0 ? "+" : ""}
                        {r.difference.toLocaleString("ko-KR")}
                      </p>
                    )}
                    <p
                      className={
                        r.resolution === "auto_adjusted"
                          ? "mt-0.5 inline-block rounded bg-success-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success"
                          : r.resolution === "manual_pending"
                            ? "mt-0.5 inline-block rounded bg-warning-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning"
                            : "mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                      }
                    >
                      {r.resolution === "auto_adjusted"
                        ? "자동 조정"
                        : r.resolution === "manual_pending"
                          ? "수동 검토"
                          : "해결됨"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 검색 sheet */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-3">
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded active:bg-muted"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <input
              type="search"
              inputMode="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제품명 검색"
              className="h-10 flex-1 rounded border bg-background px-3 text-base"
            />
          </div>
          <div className="flex-1 overflow-auto p-3">
            {query.trim().length === 0 ? (
              <p className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
                제품명 또는 별칭을 입력하세요.
              </p>
            ) : isSearching ? (
              <p className="py-4 text-center text-xs text-muted-foreground">검색 중...</p>
            ) : candidates.length === 0 ? (
              <p className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickCandidate(c)}
                      className="block w-full rounded-md border bg-background p-3 text-left active:bg-muted"
                    >
                      <p className="font-medium truncate">
                        {c.name}
                        {c.variant && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            · {c.variant}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {c.category ?? "분류 없음"}
                        {c.location && ` · 위치: ${c.location}`}
                        {" · 현재 재고 "}
                        {c.quantity.toLocaleString("ko-KR")}
                        {c.unit && <span>{c.unit}</span>}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 차이 확인 다이얼로그: 자동/수동 선택 */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next) {
            setConfirmOpen(false);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              차이 {pendingDiff > 0 ? "+" : ""}
              {pendingDiff.toLocaleString("ko-KR")}
              {selected?.unit ?? ""} 발생
            </AlertDialogTitle>
            <AlertDialogDescription>
              시스템 재고 {selected?.quantity.toLocaleString("ko-KR")} →
              실사 {countedStr || 0}
              . 어떻게 처리할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            <div className="rounded border p-3">
              <p className="font-semibold">자동 맞춤</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                차이만큼 조정 트랜잭션을 즉시 발행하여 시스템 재고를 실사값으로 맞춥니다.
              </p>
            </div>
            <div className="rounded border p-3">
              <p className="font-semibold">수동 맞춤</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                지금은 차이만 기록하고, 실제 조정은 담당자가 검토 후 별도 처리합니다.
              </p>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => saveAudit("manual")}
              disabled={isSaving}
            >
              {isSaving ? "처리 중..." : "수동 맞춤"}
            </Button>
            <Button
              type="button"
              onClick={() => saveAudit("auto")}
              disabled={isSaving}
            >
              {isSaving ? "처리 중..." : "자동 맞춤"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
