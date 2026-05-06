"use client";

import { AlertCircle, Camera, Database, Sparkles } from "lucide-react";

const KNOWLEDGE_EXAMPLES = [
  "HFIX 4㎟ 정격 허용전류와 KEC 색상 규정",
  "접지공사 종별과 접지저항 기준치",
  "옥내 비상조명 설치 의무 기준 (소방시설법)",
];

const DATA_EXAMPLES = [
  "재고 부족한 자재 보여줘",
  "이번주 발주서 어떻게 됐어?",
  "신세계 강남 현장 담당자 누구야?",
  "재고 페이지로 가고 싶어",
];

const FORBIDDEN = [
  "재고 등록·수정·삭제, 출고 처리 등 변경 작업 (페이지 안내만)",
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
        <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-foreground md:text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI에게 물어보기 — 전기·공사 + 사내 데이터</span>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground md:text-xs">
          KEC·KS·소방시설법 등 규정·시공 지식 답변에 더해, 재고·거래처·현장·발주서·자재요청
          같은 사내 데이터도 자연어로 물어볼 수 있습니다. 페이지 이동도 링크로 안내합니다.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[12px] text-muted-foreground md:text-[11px]">
          <Camera className="h-3 w-3" />
          자재·분전반·도면 사진 첨부 가능 (최대 3장)
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground md:text-xs">
          <Database className="h-3.5 w-3.5" />
          사내 데이터 질문
        </div>
        <ul className="space-y-1.5">
          {DATA_EXAMPLES.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => onPickExample(q)}
                className="block w-full rounded-md border border-border bg-card px-3 py-2 text-left text-[15px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 md:text-sm"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground md:text-xs">
          전기·소방·통신 지식 질문
        </div>
        <ul className="space-y-1.5">
          {KNOWLEDGE_EXAMPLES.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => onPickExample(q)}
                className="block w-full rounded-md border border-border bg-card px-3 py-2 text-left text-[15px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 md:text-sm"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground md:text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          답변하지 않는 항목
        </div>
        <ul className="space-y-1 rounded-md border border-dashed border-border bg-muted/20 p-3 text-[13px] text-muted-foreground md:text-xs">
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
