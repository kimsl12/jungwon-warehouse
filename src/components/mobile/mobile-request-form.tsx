"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BookOpen, Calculator, Minus, Plus, Save, Search, Trash2, X } from "lucide-react";

import {
  createMaterialRequest,
  searchProductsForRequest,
} from "@/app/(mobile)/m/request/actions";
import { createRequestTemplate } from "@/app/(mobile)/m/request/templates/actions";
import { Button } from "@/components/ui/button";
import { evaluateFormula } from "@/lib/template-formula";

type SiteOption = { id: string; name: string };

type TemplateVariable = {
  name: string;
  label: string;
  unit: string;
  default: number;
};

type RequestLine = {
  product_id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  quantity: number;
  note: string;
  /** 산출식으로 만들어진 line — true 면 삭제 막고 0 허용 */
  fromFormula: boolean;
  /** 어떤 템플릿에서 왔는지 (메타) */
  fromTemplateId: string | null;
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
  items: Array<{
    product_id: string;
    requested_quantity: number | null;
    formula: string | null;
    note?: string | null;
  }>;
  is_public: boolean;
  is_mine: boolean;
  category: string | null;
  subcategory: string | null;
  variables: TemplateVariable[] | null;
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

/**
 * 공용 템플릿(대/소분류 + 변수) 전용 picker.
 * 대분류 → 소분류 드롭박스로 템플릿 결정 → 변수 입력 → 자동 계산해서 추가.
 * 변수가 없는 템플릿도 동일 흐름으로 사용 가능 (변수 입력 단계 스킵).
 */
function CategoryTemplatePicker({
  templates,
  onApply,
}: {
  templates: TemplateOption[];
  onApply: (
    template: TemplateOption,
    computedQuantities: Map<string, number>,
  ) => void;
}) {
  const categorized = useMemo(
    () => templates.filter((t) => t.is_public && t.category),
    [templates],
  );

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of categorized) {
      if (t.category && !seen.has(t.category)) {
        seen.add(t.category);
        out.push(t.category);
      }
    }
    return out.sort((a, b) => a.localeCompare(b, "ko"));
  }, [categorized]);

  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, number>>(
    {},
  );

  const subcategories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of categorized) {
      if (t.category === category && t.subcategory && !seen.has(t.subcategory)) {
        seen.add(t.subcategory);
        out.push(t.subcategory);
      }
    }
    return out.sort((a, b) => a.localeCompare(b, "ko"));
  }, [categorized, category]);

  const templatesInSubcategory = useMemo(() => {
    return categorized
      .filter((t) => t.category === category && t.subcategory === subcategory)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [categorized, category, subcategory]);

  // 같은 (대,소) 조합에 템플릿 1개뿐이면 자동 선택
  useEffect(() => {
    if (templatesInSubcategory.length === 1) {
      setTemplateId(templatesInSubcategory[0].id);
    } else if (
      templatesInSubcategory.length > 1 &&
      !templatesInSubcategory.some((t) => t.id === templateId)
    ) {
      setTemplateId("");
    }
  }, [templatesInSubcategory, templateId]);

  const selectedTemplate = useMemo(
    () => templatesInSubcategory.find((t) => t.id === templateId) ?? null,
    [templatesInSubcategory, templateId],
  );

  // 템플릿 변경 시 변수 값 초기화
  useEffect(() => {
    if (!selectedTemplate?.variables) {
      setVariableValues({});
      return;
    }
    setVariableValues(
      Object.fromEntries(
        selectedTemplate.variables.map((v) => [v.name, v.default]),
      ),
    );
  }, [selectedTemplate]);

  // 미리보기 — formula 기반 line 의 계산 결과
  const computed = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedTemplate) return map;
    for (const it of selectedTemplate.items) {
      if (it.formula) {
        const r = evaluateFormula(it.formula, variableValues);
        map.set(it.product_id, r.ok ? Math.max(0, Math.round(r.value)) : 0);
      } else if (typeof it.requested_quantity === "number") {
        map.set(it.product_id, it.requested_quantity);
      }
    }
    return map;
  }, [selectedTemplate, variableValues]);

  if (categorized.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border bg-info-bg/30 p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <Calculator className="h-4 w-4 text-info" />
        <p className="text-xs font-semibold text-info">공용 템플릿 (산출식 기반)</p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
              setTemplateId("");
            }}
            className="h-11 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">대분류 선택…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={subcategory}
            onChange={(e) => {
              setSubcategory(e.target.value);
              setTemplateId("");
            }}
            disabled={!category}
            className="h-11 rounded-md border bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="">소분류 선택…</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {subcategory && templatesInSubcategory.length > 1 && (
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">템플릿 선택… ({templatesInSubcategory.length}개)</option>
            {templatesInSubcategory.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedTemplate &&
        selectedTemplate.variables &&
        selectedTemplate.variables.length > 0 && (
          <div className="space-y-2 rounded-md bg-background p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              변수 입력
            </p>
            <div className="grid grid-cols-2 gap-2">
              {selectedTemplate.variables.map((v) => (
                <label key={v.name} className="space-y-1">
                  <span className="block text-[11px] text-foreground">
                    {v.label}
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      ({v.name})
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={variableValues[v.name] ?? 0}
                      onChange={(e) =>
                        setVariableValues((prev) => ({
                          ...prev,
                          [v.name]: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-10 flex-1 rounded border bg-background px-2 text-right text-sm tabular-nums"
                    />
                    {v.unit && (
                      <span className="text-[11px] text-muted-foreground">
                        {v.unit}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

      <Button
        type="button"
        onClick={() => {
          if (selectedTemplate) onApply(selectedTemplate, computed);
        }}
        disabled={!selectedTemplate}
        className="w-full"
      >
        {selectedTemplate
          ? `자재 ${selectedTemplate.items.length}개 추가`
          : "템플릿을 선택하세요"}
      </Button>
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
          fromFormula: false,
          fromTemplateId: null,
        },
      ];
    });
    setSearchOpen(false);
  }

  function updateQty(idx: number, next: number) {
    const min = lines[idx]?.fromFormula ? 0 : 1;
    if (next < min) return;
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: next } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  /**
   * 산출식 템플릿 적용 — 변수 평가 결과를 받아서 각 line 의 quantity 로 사용.
   * 같은 product_id 가 이미 있으면 산출 수량으로 대체 (가산 X — 수식 의도와 충돌).
   */
  function applyComputedTemplate(
    tpl: TemplateOption,
    computedQuantities: Map<string, number>,
  ) {
    setLines((prev) => {
      const next = [...prev];
      for (const ti of tpl.items) {
        const meta = productMetaMap[ti.product_id];
        if (!meta) continue;
        const qty = computedQuantities.get(ti.product_id) ?? 0;
        const isFormula = !!ti.formula;
        const existingIdx = next.findIndex((l) => l.product_id === ti.product_id);
        if (existingIdx >= 0) {
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: qty,
            fromFormula: isFormula,
            fromTemplateId: tpl.id,
          };
        } else {
          next.push({
            product_id: ti.product_id,
            name: meta.name,
            variant: meta.variant,
            unit: meta.unit,
            quantity: qty,
            note: ti.note ?? "",
            fromFormula: isFormula,
            fromTemplateId: tpl.id,
          });
        }
      }
      return next;
    });
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
        const qty = ti.requested_quantity ?? 0;
        if (existingIdx >= 0) {
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + qty,
          };
        } else {
          next.push({
            product_id: ti.product_id,
            name: meta.name,
            variant: meta.variant,
            unit: meta.unit,
            quantity: qty,
            note: ti.note ?? "",
            fromFormula: false,
            fromTemplateId: tpl.id,
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
          formula: null,
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
    // 수량 0 line 은 제출에서 제외 (수식 line 의 0 = "필요 없음" 의미)
    const submitLines = lines.filter((l) => l.quantity > 0);
    if (submitLines.length === 0) {
      setError("수량이 1 이상인 자재를 최소 1개 추가해주세요.");
      return;
    }

    startSubmit(async () => {
      const result = await createMaterialRequest({
        site_id: siteId,
        note: note.trim() || null,
        is_urgent: isUrgent,
        urgent_reason: isUrgent ? urgentReason.trim() || null : null,
        items: submitLines.map((l) => ({
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

      {/* 카테고리 기반 공용 템플릿 picker (산출식 지원) */}
      <CategoryTemplatePicker
        templates={templates}
        onApply={(tpl, computed) => applyComputedTemplate(tpl, computed)}
      />

      {/* 단순 템플릿 묶음 — 개인 + 카테고리 없는 공용 */}
      {templates.some((t) => !t.is_public || !t.category) && (
        <button
          type="button"
          onClick={() => setTemplateOpen(true)}
          disabled={isSubmitting}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border border-secondary/30 bg-secondary/5 text-sm font-medium text-secondary active:bg-secondary/10"
        >
          <BookOpen className="h-4 w-4" />
          개인·기본 템플릿 가져오기
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
            {lines.map((l, idx) => {
              const minQty = l.fromFormula ? 0 : 1;
              return (
              <div
                key={`${l.product_id}-${idx}`}
                className={
                  "rounded-md border bg-background p-3 " +
                  (l.fromFormula ? "border-info/40" : "")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {l.name}
                      {l.variant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {l.variant}
                        </span>
                      )}
                      {l.fromFormula && (
                        <span className="ml-1.5 inline-block rounded bg-info-bg px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-info">
                          산출
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={isSubmitting || l.fromFormula}
                    title={
                      l.fromFormula
                        ? "산출식 자재는 수량 0으로 변경하세요 (삭제하면 수식이 깨질 수 있음)"
                        : "삭제"
                    }
                    className="shrink-0 rounded p-1 text-muted-foreground active:bg-muted disabled:opacity-30"
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
                    disabled={isSubmitting || l.quantity <= minQty}
                    className="flex h-11 w-11 items-center justify-center rounded border bg-surface-low active:bg-surface-high disabled:opacity-30"
                    aria-label="수량 감소"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={l.quantity}
                    min={minQty}
                    onChange={(e) => {
                      const v = Number.parseInt(e.target.value, 10);
                      if (Number.isFinite(v) && v >= minQty) updateQty(idx, v);
                    }}
                    disabled={isSubmitting}
                    className={
                      "h-11 flex-1 rounded border bg-background px-3 text-center text-base tabular-nums font-semibold " +
                      (l.quantity === 0 ? "text-muted-foreground" : "")
                    }
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
              );
            })}
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

      {/* 단순 템플릿 sheet — 카테고리 없는 공용 + 개인 (가산 모드) */}
      {templateOpen && (
        <TemplatePickerSheet
          templates={templates.filter((t) => !t.is_public || !t.category)}
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
