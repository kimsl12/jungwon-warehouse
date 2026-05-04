/**
 * 자재 신청 템플릿 산출식(formula) 평가기.
 *
 * 보안 모델 — 사용자가 작성한 임의 문자열을 안전하게 수치 계산.
 *   - 토큰 화이트리스트만 허용: 숫자(소수점 포함), 변수명(영문/숫자/_),
 *     연산자 + - * / %, 괄호 ( ), 함수 ceil/floor/round/min/max/abs,
 *     쉼표, 공백.
 *   - 그 외 문자(예: ;, =, ., ., $, @, JS keyword) 가 포함되면 즉시 거부.
 *   - 평가는 직접 작성한 작은 recursive descent parser 로 수행.
 *     eval / Function 생성자 사용 X — Server·Client 모두 안전.
 *
 * 사용:
 *   import { evaluateFormula, validateFormula } from "@/lib/template-formula";
 *   const r = evaluateFormula("ceil(L/3) + N*2", { L: 9, N: 2 });
 *   if (r.ok) console.log(r.value); else console.error(r.error);
 */

export type FormulaResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

const ALLOWED_FUNCTIONS = new Set([
  "ceil",
  "floor",
  "round",
  "min",
  "max",
  "abs",
]);

// 변수 이름 규칙: 영문 시작, 영문/숫자/_ 만. 함수 이름과 충돌 X 검증은 별도.
const VARIABLE_NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;

// 토큰 화이트리스트 (전체 문자열에 적용). 위반 시 즉시 reject.
// 허용: 0-9 . _ A-Z a-z + - * / % ( ) , 공백
const FORMULA_CHARSET_RE = /^[0-9.A-Za-z_+\-*/%(),\s]*$/;

export function isValidVariableName(name: string): boolean {
  if (!VARIABLE_NAME_RE.test(name)) return false;
  if (ALLOWED_FUNCTIONS.has(name)) return false;
  return true;
}

/**
 * 수식 문자열을 평가. variables 에 정의되지 않은 변수 사용 시 에러.
 * 결과가 NaN/Infinity 면 에러.
 */
export function evaluateFormula(
  formula: string,
  variables: Record<string, number>,
): FormulaResult {
  if (typeof formula !== "string") {
    return { ok: false, error: "수식은 문자열이어야 합니다." };
  }
  const src = formula.trim();
  if (src.length === 0) {
    return { ok: false, error: "수식이 비어 있습니다." };
  }
  if (src.length > 200) {
    return { ok: false, error: "수식이 너무 깁니다 (200자 이하)." };
  }
  if (!FORMULA_CHARSET_RE.test(src)) {
    return {
      ok: false,
      error:
        "허용되지 않는 문자가 포함됐습니다. 숫자, 변수명, +-*/%, 괄호, 함수만 사용하세요.",
    };
  }

  let tokens: Token[];
  try {
    tokens = tokenize(src);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const parser = new Parser(tokens, variables);
  let value: number;
  try {
    value = parser.parseExpression();
    parser.expectEnd();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  if (!Number.isFinite(value)) {
    return { ok: false, error: "결과가 유효한 숫자가 아닙니다." };
  }

  return { ok: true, value };
}

/**
 * 수식 자체의 유효성만 검사 (실제 평가는 안 함).
 * 변수 정의 시점에 사용 — 정의되지 않은 변수가 있으면 에러.
 */
export function validateFormula(
  formula: string,
  declaredVariables: string[],
): { ok: boolean; error?: string } {
  // 더미 값으로 한 번 평가 시도 → 파싱·변수 검증 모두 수행됨
  const dummies: Record<string, number> = {};
  for (const v of declaredVariables) dummies[v] = 1;
  const r = evaluateFormula(formula, dummies);
  if (r.ok) return { ok: true };
  return { ok: false, error: r.error };
}

// =============================================================================
// Tokenizer
// =============================================================================

type Token =
  | { kind: "number"; value: number }
  | { kind: "ident"; name: string }
  | { kind: "op"; op: "+" | "-" | "*" | "/" | "%" }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ kind: "comma" });
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%") {
      tokens.push({ kind: "op", op: c });
      i++;
      continue;
    }
    // 숫자 (정수 또는 소수)
    if ((c >= "0" && c <= "9") || c === ".") {
      let j = i;
      let dot = c === ".";
      j++;
      while (j < n) {
        const ch = src[j];
        if (ch >= "0" && ch <= "9") {
          j++;
        } else if (ch === "." && !dot) {
          dot = true;
          j++;
        } else {
          break;
        }
      }
      const numStr = src.slice(i, j);
      const num = Number(numStr);
      if (!Number.isFinite(num)) throw new Error(`잘못된 숫자: ${numStr}`);
      tokens.push({ kind: "number", value: num });
      i = j;
      continue;
    }
    // 식별자 (변수명 또는 함수명)
    if ((c >= "A" && c <= "Z") || (c >= "a" && c <= "z") || c === "_") {
      let j = i + 1;
      while (j < n) {
        const ch = src[j];
        if (
          (ch >= "A" && ch <= "Z") ||
          (ch >= "a" && ch <= "z") ||
          (ch >= "0" && ch <= "9") ||
          ch === "_"
        ) {
          j++;
        } else {
          break;
        }
      }
      tokens.push({ kind: "ident", name: src.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`알 수 없는 문자: ${c}`);
  }
  return tokens;
}

// =============================================================================
// Parser — recursive descent
//   expression := term (('+' | '-') term)*
//   term       := factor (('*' | '/' | '%') factor)*
//   factor     := unary ('^' is NOT supported)
//   unary      := ('+' | '-')* primary
//   primary    := number | variable | function '(' args ')' | '(' expression ')'
//   args       := expression (',' expression)*
// =============================================================================

class Parser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private variables: Record<string, number>,
  ) {}

  parseExpression(): number {
    let left = this.parseTerm();
    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (t.kind === "op" && (t.op === "+" || t.op === "-")) {
        this.pos++;
        const right = this.parseTerm();
        left = t.op === "+" ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseTerm(): number {
    let left = this.parseUnary();
    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (t.kind === "op" && (t.op === "*" || t.op === "/" || t.op === "%")) {
        this.pos++;
        const right = this.parseUnary();
        if ((t.op === "/" || t.op === "%") && right === 0) {
          throw new Error("0 으로 나눌 수 없습니다.");
        }
        if (t.op === "*") left = left * right;
        else if (t.op === "/") left = left / right;
        else left = left % right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): number {
    let sign = 1;
    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (t.kind === "op" && (t.op === "+" || t.op === "-")) {
        if (t.op === "-") sign = -sign;
        this.pos++;
      } else {
        break;
      }
    }
    return sign * this.parsePrimary();
  }

  private parsePrimary(): number {
    if (this.pos >= this.tokens.length) {
      throw new Error("수식이 예상보다 일찍 끝났습니다.");
    }
    const t = this.tokens[this.pos];
    if (t.kind === "number") {
      this.pos++;
      return t.value;
    }
    if (t.kind === "lparen") {
      this.pos++;
      const v = this.parseExpression();
      this.expect("rparen", "닫는 괄호 ')' 가 필요합니다.");
      return v;
    }
    if (t.kind === "ident") {
      this.pos++;
      // 다음 토큰이 '(' 면 함수 호출
      if (
        this.pos < this.tokens.length &&
        this.tokens[this.pos].kind === "lparen"
      ) {
        if (!ALLOWED_FUNCTIONS.has(t.name)) {
          throw new Error(`허용되지 않는 함수: ${t.name}`);
        }
        this.pos++; // skip '('
        const args: number[] = [];
        if (
          this.pos < this.tokens.length &&
          this.tokens[this.pos].kind !== "rparen"
        ) {
          args.push(this.parseExpression());
          while (
            this.pos < this.tokens.length &&
            this.tokens[this.pos].kind === "comma"
          ) {
            this.pos++;
            args.push(this.parseExpression());
          }
        }
        this.expect("rparen", `함수 ${t.name} 의 닫는 괄호가 필요합니다.`);
        return callFunction(t.name, args);
      }
      // 변수
      if (!Object.prototype.hasOwnProperty.call(this.variables, t.name)) {
        throw new Error(`정의되지 않은 변수: ${t.name}`);
      }
      const v = this.variables[t.name];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new Error(`변수 ${t.name} 의 값이 숫자가 아닙니다.`);
      }
      return v;
    }
    throw new Error("예상치 못한 토큰입니다.");
  }

  expectEnd(): void {
    if (this.pos < this.tokens.length) {
      throw new Error("수식 끝에 잉여 토큰이 있습니다.");
    }
  }

  private expect(kind: Token["kind"], msg: string): void {
    if (this.pos >= this.tokens.length || this.tokens[this.pos].kind !== kind) {
      throw new Error(msg);
    }
    this.pos++;
  }
}

function callFunction(name: string, args: number[]): number {
  switch (name) {
    case "ceil":
      if (args.length !== 1) throw new Error("ceil 은 인자 1개가 필요합니다.");
      return Math.ceil(args[0]);
    case "floor":
      if (args.length !== 1) throw new Error("floor 은 인자 1개가 필요합니다.");
      return Math.floor(args[0]);
    case "round":
      if (args.length !== 1) throw new Error("round 은 인자 1개가 필요합니다.");
      return Math.round(args[0]);
    case "abs":
      if (args.length !== 1) throw new Error("abs 는 인자 1개가 필요합니다.");
      return Math.abs(args[0]);
    case "min":
      if (args.length < 1) throw new Error("min 은 인자가 1개 이상 필요합니다.");
      return Math.min(...args);
    case "max":
      if (args.length < 1) throw new Error("max 는 인자가 1개 이상 필요합니다.");
      return Math.max(...args);
    default:
      throw new Error(`허용되지 않는 함수: ${name}`);
  }
}
