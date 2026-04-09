/**
 * Unit tests for the CSV import parser. Required by CLAUDE.md "Test
 * Strategy" — covers edge cases papaparse + our schema validation needs to
 * survive without crashing the import flow.
 */
import { describe, it, expect } from "vitest";

import { parseProductsCsv } from "@/lib/csv/parse";

describe("parseProductsCsv", () => {
  it("parses a minimal valid CSV with required columns only", () => {
    const csv = "제품명,수량,위치\n전선 1.5SQ,10,A-1\n차단기 30A,5,B-2\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      lineNumber: 2,
      name: "전선 1.5SQ",
      quantity: 10,
      min_quantity: 0,
      location: "A-1",
      category: null,
      unit: null,
    });
  });

  it("parses all optional columns", () => {
    const csv = "제품명,분류,단위,수량,최소수량,위치\n전선 1.5SQ,전선,롤,20,5,A-1\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      name: "전선 1.5SQ",
      category: "전선",
      unit: "롤",
      quantity: 20,
      min_quantity: 5,
      location: "A-1",
    });
  });

  it("rejects when required columns are missing", () => {
    const csv = "제품명,수량\n전선,10\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("필수 컬럼 누락");
    expect(result.error).toContain("위치");
  });

  it("skips empty rows", () => {
    const csv = "제품명,수량,위치\n\n전선,10,A-1\n\n\n차단기,5,B-2\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = '제품명,수량,위치\n"케이블, 1m",10,A-1\n"차단기, 30A, 단상",5,B-2\n';
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].name).toBe("케이블, 1m");
    expect(result.rows[1].name).toBe("차단기, 30A, 단상");
  });

  it("handles quoted fields with embedded quotes (CSV escaped as \"\")", () => {
    const csv = '제품명,수량,위치\n"전선 ""특수형""",10,A-1\n';
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].name).toBe('전선 "특수형"');
  });

  it("trims whitespace from headers and cells", () => {
    const csv = "  제품명 ,  수량 ,  위치 \n  전선  ,  10  ,  A-1  \n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      name: "전선",
      quantity: 10,
      location: "A-1",
    });
  });

  it("warns and drops rows with missing 제품명", () => {
    const csv = "제품명,수량,위치\n,10,A-1\n전선,5,B-2\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("전선");
    expect(result.warnings.some((w) => w.includes("2행") && w.includes("제품명"))).toBe(true);
  });

  it("warns and drops rows with non-numeric 수량", () => {
    const csv = "제품명,수량,위치\n전선,abc,A-1\n차단기,5,B-2\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("차단기");
    expect(result.warnings.some((w) => w.includes("수량"))).toBe(true);
  });

  it("warns and drops rows with negative 수량", () => {
    const csv = "제품명,수량,위치\n전선,-5,A-1\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("유효한 행이 없습니다.");
  });

  it("accepts 수량 with thousands separators", () => {
    const csv = "제품명,수량,위치\n전선,\"1,234\",A-1\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].quantity).toBe(1234);
  });

  it("treats invalid 최소수량 as 0 with a warning, but keeps the row", () => {
    const csv = "제품명,수량,최소수량,위치\n전선,10,abc,A-1\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].min_quantity).toBe(0);
    expect(result.warnings.some((w) => w.includes("최소수량"))).toBe(true);
  });

  it("skips duplicate names within the same file", () => {
    const csv = "제품명,수량,위치\n전선,10,A-1\n전선,5,B-2\n차단기,3,C-3\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.name)).toEqual(["전선", "차단기"]);
    expect(result.warnings.some((w) => w.includes("중복"))).toBe(true);
  });

  it("warns about unknown columns but keeps parsing", () => {
    const csv = "제품명,수량,위치,비고\n전선,10,A-1,참고메모\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes("비고"))).toBe(true);
  });

  it("handles CRLF line endings", () => {
    const csv = "제품명,수량,위치\r\n전선,10,A-1\r\n차단기,5,B-2\r\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
  });

  it("handles a 1000-row file without crashing", () => {
    const lines = ["제품명,수량,위치"];
    for (let i = 1; i <= 1000; i++) {
      lines.push(`품목${String(i).padStart(4, "0")},${i},A-${i}`);
    }
    const csv = lines.join("\n");
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1000);
    expect(result.rows[999]).toMatchObject({
      name: "품목1000",
      quantity: 1000,
      location: "A-1000",
    });
  });

  it("returns an error when no valid rows survive", () => {
    const csv = "제품명,수량,위치\n,10,A-1\n,abc,B-2\n";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(false);
  });
});
