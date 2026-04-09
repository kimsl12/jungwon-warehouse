/**
 * CSV import parser used by /inventory/import.
 *
 * Wraps papaparse to enforce our schema:
 *   필수: 제품명, 수량, 위치
 *   선택: 분류, 단위, 최소수량
 *
 * Returns either a list of normalized rows + warnings, or a fatal error.
 *
 * Why papaparse: handles quoted fields with embedded commas, BOMs, CRLF,
 * and large files (~1000+ rows) reliably. Building this from scratch
 * always loses to edge cases like: `"케이블, 1m",10,A-3`.
 */
import Papa from "papaparse";

export type ParsedProductRow = {
  /** 1-indexed source line number (header is line 1, first data row is line 2) */
  lineNumber: number;
  name: string;
  category: string | null;
  unit: string | null;
  quantity: number;
  min_quantity: number;
  location: string | null;
  /** 별칭 목록 (쉼표 구분 시 분리) */
  aliases: string[];
};

export type ParseResult =
  | {
      ok: true;
      rows: ParsedProductRow[];
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

const REQUIRED = ["제품명", "수량", "위치"] as const;
const OPTIONAL = ["분류", "단위", "최소수량", "별칭"] as const;
const ALL_HEADERS = [...REQUIRED, ...OPTIONAL];

/**
 * Parse a CSV string into validated product rows.
 *
 * Behavior:
 * - Skips fully empty rows.
 * - Trims every cell (CSV editors love trailing whitespace).
 * - Rejects the whole file if a required column is missing.
 * - Per-row errors (invalid quantity, missing name) are collected as
 *   warnings and the bad row is dropped, so a few bad rows don't kill
 *   the entire import.
 */
export function parseProductsCsv(csvText: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type === "Delimiter" || e.type === "Quotes");
    if (fatal) {
      return { ok: false, error: `CSV 형식 오류: ${fatal.message}` };
    }
  }

  const headers = result.meta.fields ?? [];
  const missing = REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `필수 컬럼 누락: ${missing.join(", ")}`,
    };
  }

  const unknownHeaders = headers.filter((h) => !ALL_HEADERS.includes(h as never));
  const warnings: string[] = [];
  if (unknownHeaders.length > 0) {
    warnings.push(`알 수 없는 컬럼은 무시됩니다: ${unknownHeaders.join(", ")}`);
  }

  const rows: ParsedProductRow[] = [];
  const seenNames = new Set<string>();

  result.data.forEach((raw, idx) => {
    const lineNumber = idx + 2; // +1 for 0-index, +1 for header line
    const name = (raw["제품명"] ?? "").trim();
    if (!name) {
      warnings.push(`${lineNumber}행: 제품명 누락 — 건너뜀`);
      return;
    }

    const quantityStr = (raw["수량"] ?? "").trim();
    const quantity = Number.parseInt(quantityStr.replace(/,/g, ""), 10);
    if (!Number.isFinite(quantity) || quantity < 0) {
      warnings.push(`${lineNumber}행 (${name}): 수량 값이 잘못됨 (${quantityStr}) — 건너뜀`);
      return;
    }

    const minQuantityStr = (raw["최소수량"] ?? "").trim();
    let minQuantity = 0;
    if (minQuantityStr !== "") {
      const parsed = Number.parseInt(minQuantityStr.replace(/,/g, ""), 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        warnings.push(
          `${lineNumber}행 (${name}): 최소수량 값이 잘못됨 (${minQuantityStr}) — 0으로 처리`,
        );
      } else {
        minQuantity = parsed;
      }
    }

    if (seenNames.has(name)) {
      warnings.push(`${lineNumber}행 (${name}): 같은 파일 내 중복 제품명 — 건너뜀`);
      return;
    }
    seenNames.add(name);

    // 별칭: 쉼표 구분 허용, 빈값·중복 제거
    const aliasRaw = (raw["별칭"] ?? "").trim();
    const aliases = aliasRaw
      ? [...new Set(aliasRaw.split(",").map((a) => a.trim()).filter(Boolean))]
      : [];

    rows.push({
      lineNumber,
      name,
      category: emptyToNull(raw["분류"]),
      unit: emptyToNull(raw["단위"]),
      quantity,
      min_quantity: minQuantity,
      location: emptyToNull(raw["위치"]),
      aliases,
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
