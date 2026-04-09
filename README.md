# 정원창고 재고관리 시스템 (jungwon-warehouse)

사내 재고 관리 시스템 — 재고 CRUD, 입출고 내역, 대시보드, 출고장 PDF, 재고 부족 알림, 활동 로그, 모바일 간편 모드, CSV 가져오기/내보내기.

자세한 사양과 규칙은 [CLAUDE.md](CLAUDE.md) 참조.

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **Supabase** — PostgreSQL + Auth + RLS + RPC
- **shadcn/ui** + **Tailwind CSS v4**
- **@react-pdf/renderer** — 출고장 PDF (Node.js 런타임)
- **recharts** — 대시보드 차트
- **Vitest** + **@testing-library/react** — 단위·통합 테스트
- **pnpm** — 패키지 매니저
- **Vercel** — 배포

## Getting Started

```bash
# 1. 환경 변수 설정
cp .env.example .env.local
# .env.local을 열고 Supabase 키 입력

# 2. 의존성 설치
pnpm install

# 3. 개발 서버 실행
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

## Commands

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 실행 |
| `pnpm lint` | ESLint 검사 |
| `pnpm test` | 테스트 1회 실행 |
| `pnpm test:watch` | 테스트 watch 모드 |

## Project Structure

```
src/
├── app/
│   ├── (auth)/         로그인·회원가입
│   ├── (dashboard)/    데스크톱 메인 (인증 필수)
│   │   ├── inventory/  재고 CRUD
│   │   ├── transactions/  입출고 내역
│   │   ├── overview/   대시보드
│   │   ├── reports/    리포트
│   │   └── activity-log/  활동 로그 (admin)
│   ├── (mobile)/m/     모바일 간편 모드
│   └── api/            API 라우트 (CSV/PDF)
├── components/         재사용 UI
│   └── ui/             shadcn/ui (수정 금지)
├── lib/
│   ├── supabase/       Supabase 클라이언트
│   ├── csv/            CSV 파싱·생성
│   └── database.types.ts  Supabase 자동생성 (수정 금지)
├── templates/          PDF 템플릿
├── fonts/              한글 폰트 (.ttf)
└── __tests__/          테스트
```

## Deploy

`main` 브랜치 push 시 [Vercel](https://vercel.com)에 자동 배포됩니다. 환경 변수는 Vercel 대시보드 > Settings > Environment Variables에서 설정.
