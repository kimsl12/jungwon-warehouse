/**
 * 거래처별 단가 CSV 파싱.
 *
 * 요구 컬럼: 제품명, 단가
 * 선택 컬럼: 변형, 비고
 *
 * 매칭 규칙: DB 내 products 테이블에서 (name, variant) 조합으로 1건 찾는다.
 * - 변형 컬럼이 비어 있으면 variant IS NULL 인 행과 매칭
 * - 매칭되는 행이 없거나 2건 이상이면 경고로 스킵
 */
import Papa from "papaparse";

export type ParsedPriceRow = {
  lineNumber: number;
  product_name: string;
  variant: string | null;
  unit_price: number;
  note: string | null;
};

export type ParsePriceResult =
  | { ok: true; rows: ParsedPriceRow[]; warnings: string[] }
  | { ok: false; error: string };

const REQUIRED = ["제품명", "단가"] as const;
const OPTIONAL = ["변형", "비고"] as const;
const ALL = [...REQUIRED, ...OPTIONAL];

export function parseVendorPricesCsv(csvText: string): ParsePriceResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type === "Delimiter" || e.type === "Quotes");
    if (fatal) return { ok: false, error: `CSV 형식 오류: ${fatal.message}` };
  }

  const headers = result.meta.fields ?? [];
  const missing = REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { ok: false, error: `필수 컬럼 누락: ${missing.join(", ")}` };
  }

  const warnings: string[] = [];
  const unknownHeaders = headers.filter((h) => !ALL.includes(h as never));
  if (unknownHeaders.length > 0) {
    warnings.push(`알 수 없는 컬럼은 무시됩니다: ${unknownHeaders.join(", ")}`);
  }

  const rows: ParsedPriceRow[] = [];
  const seen = new Set<string>();

  result.data.forEach((raw, idx) => {
    const lineNumber = idx + 2;
    const name = (raw["제품명"] ?? "").trim();
    if (!name) {
      warnings.push(`${lineNumber}행: 제품명 누락 — 건너뜀`);
      return;
    }

    const priceStr = (raw["단가"] ?? "").trim().replace(/,/g, "");
    const price = Number.parseInt(priceStr, 10);
    if (!Number.isFinite(price) || price < 0) {
      warnings.push(`${lineNumber}행 (${name}): 단가 값이 잘못됨 (${priceStr}) — 건너뜀`);
      return;
    }

    const variant = emptyToNull(raw["변형"]);
    const key = `${name}\x1f${variant ?? ""}`;
    if (seen.has(key)) {
      const label = variant ? `${name} · ${variant}` : name;
      warnings.push(`${lineNumber}행 (${label}): 같은 파일 내 중복 — 건너뜀`);
      return;
    }
    seen.add(key);

    rows.push({
      lineNumber,
      product_name: name,
      variant,
      unit_price: price,
      note: emptyToNull(raw["비고"]),
    });
  });

  if (rows.length === 0) {
    return { ok: false, error: "유효한 행이 없습니다." };
  }

  return { ok: true, rows, warnings };
}

function emptyToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
