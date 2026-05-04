import { describe, expect, it } from "vitest";

import {
  evaluateFormula,
  isValidVariableName,
  validateFormula,
} from "@/lib/template-formula";

describe("evaluateFormula — 정상 케이스", () => {
  it("단순 산술", () => {
    expect(evaluateFormula("1+2", {})).toEqual({ ok: true, value: 3 });
    expect(evaluateFormula("10-3*2", {})).toEqual({ ok: true, value: 4 });
    expect(evaluateFormula("(1+2)*3", {})).toEqual({ ok: true, value: 9 });
  });

  it("변수", () => {
    expect(evaluateFormula("L*0.5", { L: 10 })).toEqual({ ok: true, value: 5 });
    expect(evaluateFormula("L + N*2", { L: 9, N: 3 })).toEqual({
      ok: true,
      value: 15,
    });
  });

  it("함수 (ceil/floor/round)", () => {
    expect(evaluateFormula("ceil(L/3)", { L: 10 })).toEqual({
      ok: true,
      value: 4,
    });
    expect(evaluateFormula("floor(L/3)", { L: 10 })).toEqual({
      ok: true,
      value: 3,
    });
    expect(evaluateFormula("round(L/3)", { L: 10 })).toEqual({
      ok: true,
      value: 3,
    });
  });

  it("min/max/abs", () => {
    expect(evaluateFormula("max(L, N)", { L: 9, N: 3 })).toEqual({
      ok: true,
      value: 9,
    });
    expect(evaluateFormula("min(0, L-100)", { L: 50 })).toEqual({
      ok: true,
      value: -50,
    });
    expect(evaluateFormula("abs(-7)", {})).toEqual({ ok: true, value: 7 });
  });

  it("실제 사용 시나리오 — 안전계수", () => {
    // 배관 9m, 안전계수 1.1, 양끝 마감 +2
    expect(evaluateFormula("ceil(L*1.1)+2", { L: 9 })).toEqual({
      ok: true,
      value: 12,
    });
  });

  it("음수 결과 clamp 는 호출자 책임 (수식 자체는 음수 반환)", () => {
    expect(evaluateFormula("max(0, ceil(L/3)-1)", { L: 0 })).toEqual({
      ok: true,
      value: 0,
    });
  });

  it("단항 음수", () => {
    expect(evaluateFormula("-L", { L: 5 })).toEqual({ ok: true, value: -5 });
    expect(evaluateFormula("--L", { L: 5 })).toEqual({ ok: true, value: 5 });
  });
});

describe("evaluateFormula — 보안·에러 케이스", () => {
  it("허용되지 않는 문자 거부 (세미콜론, 등호)", () => {
    expect(evaluateFormula("L; alert(1)", { L: 1 }).ok).toBe(false);
    expect(evaluateFormula("L = 5", { L: 1 }).ok).toBe(false);
  });

  it("허용되지 않는 함수 거부", () => {
    expect(evaluateFormula("eval(L)", { L: 1 }).ok).toBe(false);
    expect(evaluateFormula("constructor()", {}).ok).toBe(false);
  });

  it("정의되지 않은 변수 거부", () => {
    const r = evaluateFormula("L+X", { L: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/X/);
  });

  it("0으로 나누기 거부", () => {
    expect(evaluateFormula("L/0", { L: 5 }).ok).toBe(false);
    expect(evaluateFormula("L/(N-N)", { L: 5, N: 2 }).ok).toBe(false);
  });

  it("괄호 불일치 거부", () => {
    expect(evaluateFormula("(1+2", {}).ok).toBe(false);
    expect(evaluateFormula("1+2)", {}).ok).toBe(false);
  });

  it("빈 문자열 거부", () => {
    expect(evaluateFormula("", {}).ok).toBe(false);
    expect(evaluateFormula("   ", {}).ok).toBe(false);
  });

  it("200자 초과 거부", () => {
    expect(evaluateFormula("1+".repeat(101) + "1", {}).ok).toBe(false);
  });

  it("프로토타입 오염 시도 거부", () => {
    expect(evaluateFormula("__proto__", {}).ok).toBe(false);
    expect(evaluateFormula("L.constructor", { L: 1 }).ok).toBe(false);
  });
});

describe("validateFormula", () => {
  it("선언된 변수만 사용하면 통과", () => {
    expect(validateFormula("L*0.5", ["L"]).ok).toBe(true);
    expect(validateFormula("ceil(L/3)+N*2", ["L", "N"]).ok).toBe(true);
  });

  it("미선언 변수 사용 시 실패", () => {
    expect(validateFormula("L*0.5+X", ["L"]).ok).toBe(false);
  });

  it("문법 오류 검출", () => {
    expect(validateFormula("L+", ["L"]).ok).toBe(false);
    expect(validateFormula("(L*2", ["L"]).ok).toBe(false);
  });
});

describe("isValidVariableName", () => {
  it("허용되는 이름", () => {
    expect(isValidVariableName("L")).toBe(true);
    expect(isValidVariableName("length")).toBe(true);
    expect(isValidVariableName("var_1")).toBe(true);
  });

  it("거부되는 이름", () => {
    expect(isValidVariableName("1L")).toBe(false); // 숫자 시작
    expect(isValidVariableName("L-N")).toBe(false); // 하이픈
    expect(isValidVariableName("ceil")).toBe(false); // 예약 함수명
    expect(isValidVariableName("min")).toBe(false);
    expect(isValidVariableName("")).toBe(false);
  });
});
