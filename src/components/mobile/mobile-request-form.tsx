"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BookOpen, Minus, Plus, Save, Search, Trash2, X } from "lucide-react";

import {
  createMaterialRequest,
  searchProductsForRequest,
} from "@/app/(mobile)/m/request/actions";
import { createRequestTemplate } from "@/app/(mobile)/m/request/templates/actions";
import { Button } from "@/components/ui/button";

type SiteOption = { id: string; name: string };

type RequestLine = {
  product_id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  quantity: number;
  note: string;
};

type Candidate = {
  id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  quantity: number;
  available: number;
  pending: number;
  category: string | null;
};

export type TemplateOption = {
  id: string;
  name: string;
  note: string | null;
  items: Array<{ product_id: string; requested_quantity: number; note?: string | null }>;
  is_public: boolean;
  is_mine: boolean;
};

type ProductMetaMap = Record<
  string,
  { name: string; variant: string | null; unit: string | null }
>;

function TemplatePickerSheet({
  templates,
  onClose,
  onApply,
}: {
  templates: TemplateOption[];
  onClose: () => void;
  onApply: (picked: TemplateOption[]) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const publicTpls = templates.filter((t) => t.is_public);
  const privateTpls = templates.filter((t) => !t.is_public);

  function handleApply() {
    const selected = templates.filter((t) => picked.has(t.id));
    if (selected.length === 0) return;
    onApply(selected);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded active:bg-muted"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-semibold">템플릿 불러오기</p>
            <p className="text-[10px] text-muted-foreground">
              여러 개 선택 가능 · 합쳐서 추가됩니다
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleApply}
          disabled={picked.size === 0}
          size="sm"
        >
          {picked.size}개 적용
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {templates.length === 0 ? (
          <p className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
            등록된 템플릿이 없습니다.
          </p>
        ) : (
          <>
            {publicTpls.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  공용 템플릿 ({publicTpls.length})
                </h4>
                <ul className="space-y-2">
                  {publicTpls.map((t) => (
                    <TemplateRow
                      key={t.id}
                      tpl={t}
                      checked={picked.has(t.id)}
                      onToggle={() => toggle(t.id)}
                    />
                  ))}
                </ul>
              </section>
            )}
            {privateTpls.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  내 템플릿 ({privateTpls.length})
                </h4>
                <ul className="space-y-2">
                  {privateTpls.map((t) => (
                    <TemplateRow
                      key={t.id}
                      tpl={t}
                      checked={picked.has(t.id)}
                      onToggle={() => toggle(t.id)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TemplateRow({
  tpl,
  checked,
  onToggle,
}: {
  tpl: TemplateOption;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label className="flex items-start gap-3 rounded-md border bg-background p-3 active:bg-muted">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 h-5 w-5"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{tpl.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            자재 {tpl.items.length}개
            {tpl.is_public && " · 공용"}
          </p>
          {tpl.note && (
            <p className="mt-1 text-xs text-muted-foreground truncate">{tpl.note}</p>
          )}
        </div>
      </label>
    </li>
  );
}

export function MobileRequestForm({
  sites,
  templates = [],
  productMetaMap = {},
  initialLines = [],
  initialSiteId,
}: {
  sites: SiteOption[];
  templates?: TemplateOption[];
  productMetaMap?: ProductMetaMap;
  initialLines?: RequestLine[];
  initialSiteId?: string;
}) {
  const router = useRouter();
  const [siteId, setSiteId] = useState<string>(
    initialSiteId ?? (sites.length === 1 ? sites[0].id : ""),
  );
  const [lines, setLines] = useState<RequestLine[]>(initialLines);
  const [note, setNote] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgentReason, setUrgentReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  // 자재 검색 sheet
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isSearching, startSearch] = useTransition();

  // 템플릿 sheet + 저장 다이얼로그
  const [templateOpen, setTemplateOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveIsPublic, setSaveIsPublic] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    if (!searchOpen) return;
    const handle = setTimeout(() => {
      if (query.trim().length === 0) {
        setCandidates([]);
        return;
      }
      startSearch(async () => {
        const results = await searchProductsForRequest(query);
        setCandidates(results);
      });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchOpen]);

  function openSearch() {
    setQuery("");
    setCandidates([]);
    setSearchOpen(true);
  }

  function addLine(c: Candidate) {
    // 중복 추가 차단 — 이미 있으면 수량 +1
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === c.id);
      if (existing) {
        return prev.map((l) =>
          l.product_id === c.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          product_id: c.id,
          name: c.name,
          variant: c.variant,
          unit: c.unit,
          quantity: 1,
          note: "",
        },
      ];
    });
    setSearchOpen(false);
  }

  function updateQty(idx: number, next: number) {
    if (next < 1) return;
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: next } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLineNote(idx: number, value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, note: value } : l)));
  }

  /**
   * 템플릿을 기존 라인에 병합. 같은 product_id가 이미 있으면 수량을 합산.
   * 여러 템플릿을 순차적으로 적용 가능.
   */
  function applyTemplate(tpl: TemplateOption) {
    setLines((prev) => {
      const next = [...prev];
      for (const ti of tpl.items) {
        const meta = productMetaMap[ti.product_id];
        // 메타 정보가 없으면 (제품이 삭제된 경우) 스킵
        if (!meta) continue;
        const existingIdx = next.findIndex((l) => l.product_id === ti.product_id);
        if (existingIdx >= 0) {
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + ti.requested_quantity,
          };
        } else {
          next.push({
            product_id: ti.product_id,
            name: meta.name,
            variant: meta.variant,
            unit: meta.unit,
            quantity: ti.requested_quantity,
            note: ti.note ?? "",
          });
        }
      }
      return next;
    });
  }

  function handleSaveTemplate() {
    if (lines.length === 0) {
      setSaveError("자재가 없어 템플릿을 만들 수 없습니다.");
      return;
    }
    const name = saveName.trim();
    if (!name) {
      setSaveError("템플릿 이름을 입력해주세요.");
      return;
    }
    setSaveError(null);
    startSave(async () => {
      const result = await createRequestTemplate({
        name,
        note: null,
        is_public: saveIsPublic,
        items: lines.map((l) => ({
          product_id: l.product_id,
          requested_quantity: l.quantity,
          note: l.note.trim() || null,
        })),
      });
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setSaveOpen(false);
      setSaveName("");
      setSaveIsPublic(false);
      router.refresh();
    });
  }

  function handleSubmit() {
    setError(null);

    if (!siteId) {
      setError("현장을 선택해주세요.");
      return;
    }
    if (lines.length === 0) {
      setError("최소 1개 이상의 자재를 추가해주세요.");
      return;
    }

    startSubmit(async () => {
      const result = await createMaterialRequest({
        site_id: siteId,
        note: note.trim() || null,
        is_urgent: isUrgent,
        urgent_reason: isUrgent ? urgentReason.trim() || null : null,
        items: lines.map((l) => ({
          product_id: l.product_id,
          requested_quantity: l.quantity,
          note: l.note.trim() || null,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/m/request/${result.request_id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* 현장 선택 */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="site">
          현장 <span className="text-destructive">*</span>
        </label>
        <select
          id="site"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          disabled={isSubmitting}
          className="mt-1 h-12 w-full rounded-md border bg-background px-3 text-base"
        >
          <option value="">현장 선택…</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* 템플릿 바로가기 */}
      {templates.length > 0 && (
        <button
          type="button"
          onClick={() => setTemplateOpen(true)}
          disabled={isSubmitting}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border border-secondary/30 bg-secondary/5 text-sm font-medium text-secondary active:bg-secondary/10"
        >
          <BookOpen className="h-4 w-4" />
          템플릿에서 자재 가져오기 ({templates.length}개)
        </button>
      )}

      {/* 자재 목록 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">
            자재 목록 ({lines.length})
          </label>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setSaveName("");
                setSaveIsPublic(false);
                setSaveOpen(true);
              }}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary"
            >
              <Save className="h-3 w-3" /> 템플릿으로 저장
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <button
            type="button"
            onClick={openSearch}
            disabled={isSubmitting}
            className="mt-1 flex min-h-[88px] w-full items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground active:bg-muted"
          >
            <Search className="h-4 w-4" />
            자재 검색해서 추가하기
          </button>
        ) : (
          <div className="mt-1 space-y-2">
            {lines.map((l, idx) => (
              <div key={`${l.product_id}-${idx}`} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {l.name}
                      {l.variant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {l.variant}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={isSubmitting}
                    className="shrink-0 rounded p-1 text-muted-foreground active:bg-muted"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {/* 수량 입력 */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(idx, l.quantity - 1)}
                    disabled={isSubmitting || l.quantity <= 1}
                    className="flex h-11 w-11 items-center justify-center rounded border bg-surface-low active:bg-surface-high"
                    aria-label="수량 감소"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={l.quantity}
                    min={1}
                    onChange={(e) => {
                      const v = Number.parseInt(e.target.value, 10);
                      if (Number.isFinite(v) && v >= 1) updateQty(idx, v);
                    }}
                    disabled={isSubmitting}
                    className="h-11 flex-1 rounded border bg-background px-3 text-center text-base tabular-nums font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(idx, l.quantity + 1)}
                    disabled={isSubmitting}
                    className="flex h-11 w-11 items-center justify-center rounded border bg-surface-low active:bg-surface-high"
                    aria-label="수량 증가"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {l.unit && (
                    <span className="text-sm text-muted-foreground">{l.unit}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={l.note}
                  onChange={(e) => updateLineNote(idx, e.target.value)}
                  maxLength={200}
                  placeholder="메모 (선택)"
                  disabled={isSubmitting}
                  className="mt-2 h-10 w-full rounded border bg-background px-3 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={openSearch}
              disabled={isSubmitting}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border text-sm active:bg-muted"
            >
              <Plus className="h-4 w-4" /> 자재 추가
            </button>
          </div>
        )}
      </div>

      {/* 긴급 체크 */}
      <div className="rounded-md border p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            disabled={isSubmitting}
            className="h-5 w-5 rounded border-muted-foreground/30"
          />
          <AlertCircle className="h-4 w-4 text-danger" />
          <span>긴급 처리 요청</span>
        </label>
        {isUrgent && (
          <div>
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="urgent-reason">
              긴급 사유 (선택)
            </label>
            <input
              id="urgent-reason"
              type="text"
              value={urgentReason}
              onChange={(e) => setUrgentReason(e.target.value)}
              disabled={isSubmitting}
              maxLength={200}
              className="mt-1 h-10 w-full rounded border bg-background px-3 text-sm"
              placeholder="예: 현장 대기 중, 오늘 중 필요"
            />
          </div>
        )}
      </div>

      {/* 전체 비고 */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="note">
          비고 (선택)
        </label>
        <textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isSubmitting}
          maxLength={500}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="예: 금요일 오전까지 입고 부탁드립니다."
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || lines.length === 0 || !siteId}
        className="h-12 w-full text-base font-semibold"
      >
        {isSubmitting ? "제출 중..." : "신청 제출"}
      </Button>

      {/* 템플릿 선택 sheet (다중 선택 가능 — 여러 묶음을 합쳐 추가) */}
      {templateOpen && (
        <TemplatePickerSheet
          templates={templates}
          onClose={() => setTemplateOpen(false)}
          onApply={(picked) => {
            for (const t of picked) applyTemplate(t);
            setTemplateOpen(false);
          }}
        />
      )}

      {/* 템플릿 저장 다이얼로그 */}
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md bg-background rounded-t-lg sm:rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">템플릿 저장</h3>
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="p-1 text-muted-foreground"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              현재 추가한 {lines.length}개 자재를 템플릿으로 저장합니다. 나중에 신청 작성 시
              불러와 한 번에 추가할 수 있습니다.
            </p>
            <div>
              <label className="text-xs font-medium" htmlFor="tpl-name">
                템플릿 이름
              </label>
              <input
                id="tpl-name"
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                maxLength={60}
                disabled={isSaving}
                placeholder="예: 분전반 기본 세트"
                className="mt-1 h-11 w-full rounded border bg-background px-3 text-sm"
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveIsPublic}
                onChange={(e) => setSaveIsPublic(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4"
              />
              <span>공용 템플릿으로 공개 (관리자만 가능)</span>
            </label>
            {saveError && (
              <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {saveError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveOpen(false)}
                disabled={isSaving}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSaving || !saveName.trim()}
                className="flex-1"
              >
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 자재 검색 sheet */}
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
                      onClick={() => addLine(c)}
                      className="block w-full rounded-md border bg-background p-3 text-left active:bg-muted"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {c.name}
                            {c.variant && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                · {c.variant}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                            {c.category ?? "분류 없음"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-muted-foreground tabular-nums">
                            재고 {c.quantity.toLocaleString("ko-KR")}
                            {c.unit && (
                              <span className="ml-0.5 text-[11px]">{c.unit}</span>
                            )}
                          </p>
                          {c.pending > 0 && (
                            <p
                              className={
                                c.available === 0
                                  ? "text-[10px] font-semibold text-destructive tabular-nums"
                                  : "text-[10px] font-medium text-warning tabular-nums"
                              }
                            >
                              가용 {c.available.toLocaleString("ko-KR")} (대기 {c.pending.toLocaleString("ko-KR")})
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
