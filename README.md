# 정원창고 재고관리 시스템 (jungwon-warehouse)

주식회사 정원전기 사내 재고 관리 시스템 — 재고 CRUD, 입출고 내역 관리, 대시보드(리포트/차트), 출고장 PDF, 재고 부족 알림, 활동 로그, 모바일 간편 모드, CSV 가져오기/내보내기.

🚀 **프로덕션**: https://jungwon-warehouse.vercel.app

자세한 사양과 규칙은 [CLAUDE.md](CLAUDE.md) 참조.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** — PostgreSQL + Auth + RLS + RPC + Triggers
- **shadcn/ui** + **Tailwind CSS v4**
- **@react-pdf/renderer** — 출고장 PDF (Node.js 런타임 + Noto Sans KR)
- **recharts** — 대시보드 차트
- **papaparse** — CSV 파싱
- **Vitest** + **@testing-library/react** — 단위·통합 테스트
- **pnpm** — 패키지 매니저
- **Vercel** — 배포

## Getting Started (Local Development)

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

> **Windows + 한글 폴더 경로 주의**: Turbopack은 byte-boundary 버그로 한글 경로에서 panic합니다. `pnpm dev` / `pnpm build`는 이미 `--webpack` 플래그가 설정되어 있어서 자동으로 webpack을 사용합니다.

## Commands

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 실행 (webpack) |
| `pnpm build` | 프로덕션 빌드 (webpack) |
| `pnpm start` | 프로덕션 서버 실행 |
| `pnpm lint` | ESLint 검사 |
| `pnpm test` | 테스트 1회 실행 |
| `pnpm test:watch` | 테스트 watch 모드 |
| `pnpm db:push` | Supabase 마이그레이션 적용 |
| `pnpm gen:types` | DB 스키마 → TypeScript 타입 재생성 |

## Project Structure

```
src/
├── app/
│   ├── (auth)/         로그인·회원가입
│   ├── (dashboard)/    데스크톱 메인 (인증 필수)
│   │   ├── inventory/  재고 CRUD + CSV 가져오기
│   │   ├── transactions/  입출고 내역 + CSV/PDF 내보내기
│   │   ├── overview/   대시보드 (KPI + 차트 + 최근 내역)
│   │   ├── reports/    리포트 (12개월 추이 + Top 10 출고)
│   │   └── activity-log/  활동 로그 (admin 전용)
│   ├── (mobile)/m/     모바일 간편 모드 (scan→transaction→done)
│   └── api/
│       ├── export/     CSV 다운로드 (products / transactions)
│       └── pdf/        출고장 PDF 생성 (nodejs runtime)
├── components/         재사용 UI 컴포넌트
│   └── ui/             shadcn/ui (직접 수정 금지)
├── lib/
│   ├── supabase/       Supabase 클라이언트 + RPC 래퍼
│   ├── csv/            CSV 파싱·생성 유틸
│   ├── company.ts      회사 정보 단일 소스
│   ├── summary-normalizers.ts  대시보드 차트 데이터 정규화
│   └── database.types.ts  Supabase 자동생성 (수동 수정 금지)
├── templates/          PDF 템플릿
├── fonts/              한글 폰트 .ttf (Noto Sans KR Regular/Bold)
└── __tests__/          테스트 (40개)

supabase/
└── migrations/         DB 마이그레이션 (스키마/RLS/RPC/트리거/뷰)
```

---

## 일상 운영 가이드

### 로그인 & 권한

- 모든 사용자는 `/login`에서 이메일/비밀번호 로그인
- 신규 사용자는 `/signup`에서 가입 (기본 권한: `user`)
- **admin 권한 승격**은 Supabase Dashboard에서 직접:
  1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
  2. Authentication → Users → 대상 사용자 클릭
  3. Table Editor → `profiles` 테이블 → 해당 행의 `role`을 `'admin'`으로 변경

| 권한 | 가능 작업 |
|---|---|
| `admin` | 모든 CRUD + CSV 가져오기 + 활동 로그 조회 + 사용자 관리 |
| `user`  | 재고 조회 + 입출고 등록 + CSV 내보내기 |

### 재고 등록 (3가지 방법)

1. **단건 등록** (admin): `/inventory` → 우측 상단 "추가" 버튼
2. **CSV 일괄 등록** (admin): `/inventory/import`
   - 필수 컬럼: `제품명, 수량, 위치`
   - 선택 컬럼: `분류, 단위, 최소수량`
   - UTF-8로 저장 (엑셀 → "다른 이름으로 저장" → "CSV UTF-8(.csv)")
   - 미리보기에서 신규/기존 확인 후 **건너뛰기** 또는 **덮어쓰기** 선택
   - **덮어쓰기**: 분류/단위/위치/최소수량만 갱신, **수량은 보존** (이력 보호)
3. **모바일에서**: 현재는 미지원 — 모바일은 입출고 처리 전용

### 입출고 처리

**데스크톱**:
- `/inventory` → 행의 "처리" 버튼 → 다이얼로그에서 입고/출고 + 수량 + 메모 입력
- 출고 시 재고가 부족하면 자동으로 차단 (음수 재고 불가)
- 처리 후 재고가 최소 수량 이하로 떨어지면 다음 화면에 경고 배너 자동 표시

**모바일** (`/m/scan`):
1. 품목 검색 → 탭
2. 입고/출고 선택 → 수량 입력 → "확정"
3. 결과 화면 → "다른 품목 처리" 또는 "데스크톱 모드로"

### 출고장 PDF 발행

1. `/transactions`에서 **구분 = 출고**로 필터링 (필요시 기간/품목/담당자 필터 추가)
2. 우측 상단 "**출고장 PDF**" 버튼 클릭
3. PDF가 자동 다운로드됨 (회사 헤더 + 로고 + 품목 표 + 합계 + 서명란)
4. 한 번에 최대 100건까지 1장에 정리됨

### CSV 내보내기

- **재고 목록**: `/inventory` → "CSV 내보내기" → `정원창고_재고목록_YYYYMMDD.csv`
- **입출고 내역**: `/transactions` → "CSV 내보내기" → `정원창고_입출고내역_YYYYMMDD.csv`
- 두 파일 모두 UTF-8 BOM이 포함되어 엑셀에서 한글 깨짐 없음
- 입출고 내역은 화면 필터를 그대로 반영해서 내보내짐

### 재고 부족 알림

- 모든 인증 페이지 상단에 글로벌 배너로 자동 표시
- 조건: `현재 수량 ≤ 최소 수량` AND `최소 수량 > 0`
- 최소 수량을 설정하지 않은 품목은 알림 대상에서 제외
- 클릭 시 대시보드(`/overview`)로 이동해 상세 리스트 확인

### 대시보드 & 리포트

- `/overview`: KPI 카드(총 품목/재고 부족/7일 입출고) + 7일 입출고 차트 + 부족 품목 리스트 + 최근 내역 5건
- `/reports`: 12개월 입출고 추이 라인 차트 + 출고 Top 10 수평 바 차트 + 전월 대비 출고 증감
- `/activity-log` (admin only): 모든 데이터 변경 이력 (생성/수정/삭제/입고/출고)

### 활동 로그

- DB 트리거가 자동으로 모든 변경사항 기록 (앱이 다운되어도 누락 안 됨)
- Supabase Dashboard에서 직접 수정해도 로그 남음 (단, `user_id`는 `null`로 기록)
- admin만 조회 가능 (RLS 적용)
- **삭제·수정 불가** — 감사 로그 무결성 보장

---

## Deployment (Vercel)

### 첫 배포

1. [Vercel](https://vercel.com/new) → "Add New Project" → GitHub 저장소 `kimsl12/jungwon-warehouse` 선택
2. **Framework Preset**: Next.js (자동 감지됨)
3. **Build Command**: `pnpm build` (그대로)
4. **Install Command**: `pnpm install` (그대로)
5. **Environment Variables** 추가:

| 변수 | 값 | 어디서 가져오는지 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-id>.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase Dashboard → Settings → API Keys → "anon" / "publishable" |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Supabase Dashboard → Settings → API Keys → "service_role" / "secret" — **클라이언트에 절대 노출 금지** |

6. "Deploy" 클릭 → 1~2분 대기

### 첫 배포 후 필수 작업

1. **Supabase URL Configuration 업데이트**
   - Supabase Dashboard → Authentication → URL Configuration
   - **Site URL**: `https://<your-project>.vercel.app`
   - **Redirect URLs**: `https://<your-project>.vercel.app/**` 추가
   - 이걸 안 하면 회원가입 confirmation 이메일 링크가 localhost로 향함

2. **출고장 PDF 동작 확인**
   - 프로덕션에서 `/transactions` → 구분=출고 필터 → "출고장 PDF" 클릭
   - 한글이 깨지지 않고 로고가 정상 표시되는지 확인
   - (만약 깨지면 Vercel function 로그 확인 — `outputFileTracingIncludes` 누락 가능)

3. **회원가입 후 admin 승격 재확인**
   - 새 도메인으로 가입 → Supabase에서 role 변경

### 자동 배포 (이후)

- `main` 브랜치에 `git push`하면 Vercel이 자동으로 빌드 + 배포
- 환경 변수 변경 시 Vercel 대시보드에서 수정 후 재배포 트리거 필요
- PR을 만들면 Vercel이 자동으로 Preview 배포 URL 생성 (옵션)

---

## 운영 시 주의사항

### Supabase 무료 티어
- **7일간 미사용 시 DB가 일시 정지됨** → Supabase Dashboard에서 수동 재개 필요
- 정기적으로 (최소 주 1회) 대시보드에 접속해서 관리할 것
- 트래픽이 늘면 Pro 플랜($25/월) 고려

### 데이터 백업
- Supabase 무료 티어는 자동 백업 7일분 제공 (Pro는 30일)
- 추가 안전망: 매월 1회 정도 `/inventory` + `/transactions`에서 CSV 내보내기 받아 보관 권장
- 정말 중요한 작업 전엔 Supabase Dashboard → Database → Backups에서 수동 백업 가능 (Pro)

### 환경 변수 관리
- `.env.local`은 절대 commit 금지 (`.gitignore`로 보호됨)
- Vercel에 등록한 환경 변수는 Vercel UI에서만 관리
- 키 노출 의심 시 Supabase Dashboard에서 즉시 rotate 후 Vercel에도 갱신

### 음수 재고 방지
- `process_transaction` RPC가 출고 시 재고를 체크하므로 일반 흐름에선 음수 불가
- Supabase Dashboard에서 직접 수정 시 음수 입력 가능하니 **앱을 통해서만 수정** 권장

### 모바일 접근
- 별도 앱이 아니라 모바일 브라우저에서 `https://<your-project>.vercel.app/m/scan` 접속
- 홈 화면에 추가하면 PWA처럼 사용 가능 (현재는 PWA manifest 미설정)

---

## Troubleshooting

| 증상 | 원인 | 해결 |
|---|---|---|
| 회원가입 confirmation 이메일이 localhost로 보냄 | Supabase Site URL 미설정 | URL Configuration 업데이트 |
| 출고장 PDF의 한글이 ㅁㅁㅁ로 깨짐 | 폰트 파일이 serverless function에 미포함 | `next.config.ts`의 `outputFileTracingIncludes` 확인 |
| CSV 엑셀에서 한글 깨짐 | UTF-8 BOM 없음 | 코드 변경 없이 자동 추가됨 — 다른 도구 문제 가능 |
| 재고 부족 배너가 안 뜸 | 최소 수량이 0 (미설정) | 품목 수정에서 최소 수량 입력 |
| 대시보드 차트가 비어있음 | 입출고 데이터가 7일/12개월 윈도우 밖 | 정상 — 데이터가 쌓이면 자동으로 채워짐 |
| Supabase에서 "project paused" 메시지 | 무료 티어 7일 미사용 | Dashboard에서 "Restore project" 클릭 |

---

## 추가 개발 시

- 새 기능 추가는 `feat(phase-N): ...` 형태로 commit
- DB 스키마 변경: `supabase/migrations/`에 새 마이그레이션 파일 추가 → `pnpm db:push` → `pnpm gen:types`
- 새 shadcn/ui 컴포넌트: `pnpm dlx shadcn@latest add <component>` (npx 아님)
- 컴포넌트는 200줄 이하로 유지, 초과 시 분리

자세한 컨벤션은 [CLAUDE.md](CLAUDE.md) 참조.
