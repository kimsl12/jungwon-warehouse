"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  TemplateProductPicker,
  type PickerProduct,
} from "@/components/requests/template-product-picker";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  evaluateFormula,
  isValidVariableName,
} from "@/lib/template-formula";

export type TemplateVariableInput = {
  name: string;
  label: string;
  unit: string;
  default: number;
};

export type TemplateFormLine = {
  product_id: string;
  name: string;
  variant: string | null;
  unit: string | null;
  /** 고정 수량 모드 */
  requested_quantity: number | null;
  /** 수식 모드 */
  formula: string | null;
};

export type TemplateFormValues = {
  name: string;
  note: string;
  isPublic: boolean;
  category: string;
  subcategory: string;
  variables: TemplateVariableInput[];
  lines: TemplateFormLine[];
};

const DEFAULT_VALUES: TemplateFormValues = {
  name: "",
  note: "",
  isPublic: true,
  category: "",
  subcategory: "",
  variables: [],
  lines: [],
};

type Props = {
  initialValues?: TemplateFormValues;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  error: string | null;
  isAdmin: boolean;
  onCancel: () => void;
  onSubmit: (values: TemplateFormValues) => void;
};

export function TemplateForm({
  initialValues = DEFAULT_VALUES,
  isPending,
  submitLabel,
  pendingLabel,
  error,
  isAdmin,
  onCancel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialValues.name);
  const [note, setNote] = useState(initialValues.note);
  const [isPublic, setIsPublic] = useState(initialValues.isPublic);
  const [category, setCategory] = useState(initialValues.category);
  const [subcategory, setSubcategory] = useState(initialValues.subcategory);
  const [variables, setVariables] = useState<TemplateVariableInput[]>(
    initialValues.variables,
  );
  const [lines, setLines] = useState<TemplateFormLine[]>(initialValues.lines);

  // 미리보기용 변수 값 (preview only — 저장 안 됨)
  const [previewValues, setPreviewValues] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        initialValues.variables.map((v) => [v.name, v.default]),
      ),
  );

  const declaredVarNames = useMemo(
    () => variables.map((v) => v.name).filter(Boolean),
    [variables],
  );

  // ─────── Lines ───────
  function addProduct(p: PickerProduct) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.product_id === p.id
            ? {
                ...l,
                requested_quantity: (l.requested_quantity ?? 0) + 1,
                formula: null,
              }
            : l,
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          variant: p.variant,
          unit: p.unit,
          requested_quantity: 1,
          formula: null,
        },
      ];
    });
  }

  function updateQuantity(product_id: string, quantity: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.product_id === product_id
          ? { ...l, requested_quantity: Math.max(0, quantity), formula: null }
          : l,
      ),
    );
  }

  function updateFormula(product_id: string, formula: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.product_id === product_id
          ? { ...l, formula, requested_quantity: null }
          : l,
      ),
    );
  }

  function toggleMode(product_id: string, mode: "fixed" | "formula") {
    setLines((prev) =>
      prev.map((l) => {
        if (l.product_id !== product_id) return l;
        if (mode === "fixed") {
          return { ...l, requested_quantity: 1, formula: null };
        }
        return { ...l, formula: "L", requested_quantity: null };
      }),
    );
  }

  function removeLine(product_id: string) {
    setLines((prev) => prev.filter((l) => l.product_id !== product_id));
  }

  // ─────── Variables ───────
  function addVariable() {
    if (variables.length >= 5) return;
    const next: TemplateVariableInput = {
      name: variables.length === 0 ? "L" : `V${variables.length + 1}`,
      label: variables.length === 0 ? "배관 길이" : "",
      unit: variables.length === 0 ? "m" : "",
      default: 0,
    };
    setVariables((prev) => [...prev, next]);
    setPreviewValues((prev) => ({ ...prev, [next.name]: next.default }));
  }

  function updateVariable(idx: number, patch: Partial<TemplateVariableInput>) {
    setVariables((prev) => {
      const next = [...prev];
      const oldName = next[idx].name;
      next[idx] = { ...next[idx], ...patch };
      // 변수명 변경 시 미리보기 키 업데이트
      if (patch.name && patch.name !== oldName) {
        setPreviewValues((pv) => {
          const np: Record<string, number> = { ...pv };
          delete np[oldName];
          np[patch.name!] = next[idx].default;
          return np;
        });
      }
      return next;
    });
  }

  function removeVariable(idx: number) {
    const removed = variables[idx];
    setVariables((prev) => prev.filter((_, i) => i !== idx));
    setPreviewValues((pv) => {
      const np = { ...pv };
      delete np[removed.name];
      return np;
    });
  }

  function setPreview(varName: string, value: number) {
    setPreviewValues((pv) => ({ ...pv, [varName]: value }));
  }

  // ─────── Variable name 검증 ───────
  function variableError(idx: number): string | null {
    const v = variables[idx];
    if (!v.name.trim()) return "이름 필요";
    if (!isValidVariableName(v.name))
      return "영문 시작, 영문/숫자/_, 함수명(ceil 등) 제외";
    if (variables.findIndex((x) => x.name === v.name) !== idx)
      return "이름 중복";
    return null;
  }

  const showPublicFields = isAdmin && isPublic;

  return (
    <>
      <div className="space-y-4">
        {/* 이름 */}
        <div>
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            이름 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
            placeholder="예: ST 25mm 노출 시공"
            disabled={isPending}
          />
        </div>

        {/* 메모 */}
        <div>
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            메모
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
            placeholder="선택 사항"
            disabled={isPending}
          />
        </div>

        {/* 공개 범위 */}
        {isAdmin && (
          <div>
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              공개 범위
            </label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                  isPublic
                    ? "border-secondary bg-secondary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-surface-low"
                }`}
                disabled={isPending}
              >
                공용 (전체 공유)
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                  !isPublic
                    ? "border-secondary bg-secondary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-surface-low"
                }`}
                disabled={isPending}
              >
                개인 (본인만)
              </button>
            </div>
          </div>
        )}

        {/* 공용 전용: 대/소분류 */}
        {showPublicFields && (
          <div className="grid grid-cols-2 gap-3 rounded border border-dashed border-secondary/40 bg-secondary/5 p-3">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                대분류
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={40}
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                placeholder="예: 전기 배관"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                소분류
              </label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                maxLength={60}
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                placeholder="예: ST 강제전선관 25mm"
                disabled={isPending}
              />
            </div>
          </div>
        )}

        {/* 공용 전용: 변수 정의 */}
        {showPublicFields && (
          <div className="rounded border border-dashed border-secondary/40 bg-secondary/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                변수 ({variables.length}/5)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariable}
                disabled={isPending || variables.length >= 5}
              >
                <Plus className="h-3 w-3" /> 변수 추가
              </Button>
            </div>
            {variables.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                변수를 추가하면 자재 수량을 수식으로 산출할 수 있습니다 (예: L =
                배관 길이).
              </p>
            ) : (
              <ul className="space-y-2">
                {variables.map((v, idx) => {
                  const err = variableError(idx);
                  return (
                    <li
                      key={idx}
                      className="grid grid-cols-[80px_1fr_60px_80px_auto] items-center gap-2"
                    >
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) =>
                          updateVariable(idx, { name: e.target.value })
                        }
                        maxLength={20}
                        placeholder="이름 (L)"
                        className={`rounded border bg-background px-2 py-1 font-mono text-xs ${
                          err ? "border-destructive" : ""
                        }`}
                        disabled={isPending}
                      />
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) =>
                          updateVariable(idx, { label: e.target.value })
                        }
                        maxLength={40}
                        placeholder="라벨 (배관 길이)"
                        className="rounded border bg-background px-2 py-1 text-xs"
                        disabled={isPending}
                      />
                      <input
                        type="text"
                        value={v.unit}
                        onChange={(e) =>
                          updateVariable(idx, { unit: e.target.value })
                        }
                        maxLength={10}
                        placeholder="단위 (m)"
                        className="rounded border bg-background px-2 py-1 text-center text-xs"
                        disabled={isPending}
                      />
                      <input
                        type="number"
                        value={v.default}
                        onChange={(e) =>
                          updateVariable(idx, {
                            default: Number(e.target.value) || 0,
                          })
                        }
                        min={0}
                        placeholder="기본값"
                        className="rounded border bg-background px-2 py-1 text-right text-xs tabular-nums"
                        disabled={isPending}
                      />
                      <button
                        type="button"
                        onClick={() => removeVariable(idx)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {err && (
                        <p className="col-span-5 text-[10px] text-destructive">
                          {err}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* 자재 */}
        <div>
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            자재 <span className="text-destructive">*</span>
          </label>
          <div className="mt-1">
            <TemplateProductPicker onPick={addProduct} disabled={isPending} />
          </div>

          {/* 미리보기용 변수 입력 (공용 + 변수 있을 때) */}
          {showPublicFields && variables.length > 0 && lines.length > 0 && (
            <div className="mt-3 rounded border border-dashed bg-info-bg/40 p-2">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                미리보기 변수값 (저장 안 됨)
              </p>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <label
                    key={v.name}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span className="font-mono text-info">{v.name}</span>
                    <input
                      type="number"
                      value={previewValues[v.name] ?? v.default}
                      onChange={(e) =>
                        setPreview(v.name, Number(e.target.value) || 0)
                      }
                      className="w-16 rounded border bg-background px-1.5 py-0.5 text-right tabular-nums"
                      min={0}
                    />
                    {v.unit && (
                      <span className="text-[10px] text-muted-foreground">
                        {v.unit}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {lines.length > 0 && (
            <ul className="mt-3 space-y-2 rounded border p-2">
              {lines.map((l) => {
                const mode = l.formula !== null ? "formula" : "fixed";
                let preview: string | null = null;
                if (mode === "formula" && l.formula) {
                  const r = evaluateFormula(l.formula, previewValues);
                  preview = r.ok
                    ? `→ ${Math.max(0, r.value).toLocaleString("ko-KR")}${l.unit ?? ""}`
                    : `⚠ ${r.error}`;
                }
                return (
                  <li
                    key={l.product_id}
                    className="space-y-1.5 rounded bg-surface-low px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {l.name}
                          {l.variant && (
                            <span className="ml-1 text-muted-foreground">
                              · {l.variant}
                            </span>
                          )}
                        </p>
                      </div>
                      {showPublicFields && variables.length > 0 && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => toggleMode(l.product_id, "fixed")}
                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                              mode === "fixed"
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            disabled={isPending}
                          >
                            고정
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleMode(l.product_id, "formula")}
                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                              mode === "formula"
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            disabled={isPending}
                          >
                            수식
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeLine(l.product_id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="삭제"
                        disabled={isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {mode === "fixed" ? (
                        <>
                          <input
                            type="number"
                            min={0}
                            value={l.requested_quantity ?? 0}
                            onChange={(e) =>
                              updateQuantity(
                                l.product_id,
                                Number(e.target.value) || 0,
                              )
                            }
                            className="w-24 rounded border bg-background px-2 py-1 text-right text-sm tabular-nums"
                            disabled={isPending}
                          />
                          <span className="text-xs text-muted-foreground">
                            {l.unit ?? ""}
                          </span>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={l.formula ?? ""}
                            onChange={(e) =>
                              updateFormula(l.product_id, e.target.value)
                            }
                            placeholder="예: ceil(L/3) + N*2"
                            className="flex-1 rounded border bg-background px-2 py-1 font-mono text-xs"
                            disabled={isPending}
                          />
                          {preview && (
                            <span
                              className={`text-[11px] tabular-nums ${
                                preview.startsWith("⚠")
                                  ? "text-destructive"
                                  : "text-success"
                              }`}
                            >
                              {preview}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {lines.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              위 검색창에서 자재를 찾아 클릭하면 목록에 추가됩니다.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          취소
        </Button>
        <Button
          type="button"
          onClick={() =>
            onSubmit({
              name,
              note,
              isPublic,
              category,
              subcategory,
              variables,
              lines,
            })
          }
          disabled={isPending}
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
