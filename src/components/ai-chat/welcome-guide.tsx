"use client";

import { AlertCircle, Camera, Sparkles } from "lucide-react";

const EXAMPLES = [
  "HFIX 4㎟ 전선의 정격 허용전류와 KEC 기준 색상 규정",
  "주택 분전반에 누전차단기는 어떤 사양으로 골라야 하나요?",
  "접지공사 종별과 접지저항 기준치 (KEC)",
  "PVC 전선관 1본 길이와 절단·연결 시공 방법",
  "옥내 비상조명 설치 의무 기준 (소방시설법)",
];

const FORBIDDEN = [
  "사내 재고 수량·발주 내역·거래처 단가 같은 운영 데이터",
  "특정 직원의 정보 (이름·연락처·직급)",
  "활선 작업 등 자격자가 직접 수행해야 하는 작업의 지시",
];

export function WelcomeGuide({
  onPickExample,
}: {
  onPickExample: (text: string) => void;
}) {
  return (
    <div className="space-y-5 px-1 py-2">
      <div className="rounded-lg border border-border bg-surface-low p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI에게 물어보기 — 전기·공사 도우미</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          KEC·KS 표준·전기공사업법·소방시설법·정보통신공사업법 등 사내에서 자주
          마주치는 규정과 시공 가이드를 답변합니다. 가능한 한 조항 번호와 표
          번호를 함께 인용합니다.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground">
          <Camera className="h-3 w-3" />
          자재·분전반·도면 사진 첨부 가능 (최대 3장)
        </p>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          이런 질문이 잘 됩니다
        </div>
        <ul className="space-y-1.5">
          {EXAMPLES.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => onPickExample(q)}
                className="block w-full rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          답변하지 않는 항목
        </div>
        <ul className="space-y-1 rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          {FORBIDDEN.map((q) => (
            <li key={q} className="flex gap-1.5">
              <span aria-hidden>·</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
