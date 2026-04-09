# Project: jungwon-warehouse

사내 재고 관리 시스템 — 재고 CRUD, 입출고 내역 관리, 대시보드(리포트/차트), 출고장 PDF, 재고 부족 알림, 활동 로그, 모바일 간편 모드, CSV 가져오기/내보내기

## Tech Stack

- Framework: Next.js (App Router) — 풀스택 단일 프로젝트, 반응형으로 웹+모바일 대응
- DB/Auth: Supabase — PostgreSQL + 인증 + RLS(행 수준 보안)을 하나로 관리
- UI: shadcn/ui + Tailwind CSS — 테이블·폼·차트 컴포넌트 활용
- PDF: @react-pdf/renderer — 출고장 PDF 생성용 (Node.js 런타임 전용)
- Chart: recharts — 대시보드 리포트 차트용
- Test: Vitest + @testing-library/react — 단위·통합 테스트
- Package Manager: pnpm
- Deploy: Vercel

## Commands

- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Test watch: `pnpm test:watch`
- Add UI component: `pnpm dlx shadcn@latest add [component-name]`
- Supabase type gen: `pnpm supabase gen types typescript --project-id $PROJECT_ID > src/lib/database.types.ts`

## Architecture

- `src/app/` — App Router 페이지 및 API 라우트
  - `(auth)/` — 로그인·회원가입 페이지 (비인증 레이아웃)
  - `(dashboard)/` — 데스크톱 메인 레이아웃 (인증 필수)
    - `inventory/` — 재고 CRUD 페이지
    - `inventory/import/` — CSV 업로드로 품목 일괄 등록
    - `transactions/` — 입출고 내역 페이지 (기간·담당자·품목 필터링, 이력 추적)
    - `overview/` — 대시보드 (재고 현황 요약, 리포트 차트)
    - `reports/` — 월별 입출고 추이, 품목별 출고 빈도 등 상세 리포트
    - `activity-log/` — 활동 로그 (admin 전용)
  - `(mobile)/m/` — 모바일 간편 모드. URL 경로는 `/m/...`
    - `m/scan/` — 품목 선택 (검색)
    - `m/transaction/` — 수량 입력 + 입고/출고 선택
    - `m/done/` — 완료 확인
  - `api/export/products/` — 재고 목록 CSV 내보내기
  - `api/export/transactions/` — 입출고 내역 CSV 내보내기
  - `api/pdf/delivery/` — 출고장 PDF 생성 (runtime: nodejs)
- `src/components/` — 재사용 UI 컴포넌트
  - `ui/` — shadcn/ui 컴포넌트 (자동 생성, 직접 수정 금지)
- `src/lib/` — 유틸리티, Supabase 클라이언트, 타입 정의
  - `supabase/client.ts` — 브라우저용 Supabase 클라이언트
  - `supabase/server.ts` — 서버용 Supabase 클라이언트
  - `database.types.ts` — Supabase 자동생성 타입 (수동 수정 금지)
  - `csv/` — CSV 파싱(가져오기) 및 생성(내보내기) 유틸리티
- `src/templates/` — 출고장 PDF 템플릿
- `src/fonts/` — 한글 폰트 파일 (PDF 생성용, Noto Sans KR 등 .ttf)
- `src/__tests__/` — 테스트 파일

## Database Schema

Supabase에서 아래 테이블 사용. RLS 정책 필수 적용.

### products (재고 품목)
- id: uuid (PK)
- name: text (제품명)
- category: text (분류. 예: '전자부품', '배관자재', '소모품')
- unit: text (수량 단위. 예: '개', '박스', 'kg', 'm')
- quantity: integer (현재 수량)
- min_quantity: integer (default 0, 최소 재고 기준 — 이 이하로 떨어지면 부족 알림)
- location: text (보관 위치)
- created_at: timestamptz
- updated_at: timestamptz

### transactions (입출고 내역)
- id: uuid (PK)
- product_id: uuid (FK → products)
- type: text ('in' | 'out')
- quantity: integer (변동 수량, 양수)
- note: text (nullable, 메모)
- created_by: uuid (FK → auth.users)
- created_at: timestamptz

### profiles (사용자 프로필)
- id: uuid (PK, FK → auth.users)
- name: text
- role: text ('admin' | 'user')

### activity_logs (활동 로그)
- id: uuid (PK)
- user_id: uuid (FK → auth.users, nullable — DB 트리거 경유 시 null 가능)
- action: text ('create' | 'update' | 'delete' | 'in' | 'out')
- table_name: text (대상 테이블명)
- record_id: uuid (대상 레코드 ID)
- details: jsonb (변경 전/후 값. 예: {"field": "quantity", "before": 100, "after": 80})
- created_at: timestamptz

## Supabase RPC & Views

### RPC: process_transaction(p_product_id uuid, p_type text, p_quantity int, p_note text, p_user_id uuid)
1. p_type = 'out'이면: products.quantity - p_quantity < 0인지 확인. 음수이면 `RAISE EXCEPTION 'INSUFFICIENT_STOCK'`으로 트랜잭션 롤백. 음수 재고는 허용하지 않는다.
2. products.quantity 업데이트 (in: += p_quantity, out: -= p_quantity). updated_at도 갱신.
3. transactions 테이블에 INSERT.
4. activity_logs는 DB 트리거가 자동 기록 — RPC에서 수동 INSERT하지 않는다.
5. 업데이트 후 quantity <= min_quantity이면 반환값에 `low_stock: true` 포함.
6. 위 1~3은 단일 PostgreSQL 트랜잭션. 하나라도 실패 시 전체 롤백.
- 에러 핸들링: 클라이언트는 RPC 호출 결과에서 error.message === 'INSUFFICIENT_STOCK'을 체크하여 "재고 부족" 알림을 표시하라.

### RPC: bulk_import_products(p_products jsonb, p_user_id uuid)
CSV 일괄 등록용. p_products는 [{name, category, unit, quantity, min_quantity, location}, ...] 배열.

### View: monthly_transaction_summary
transactions를 월별·type별로 GROUP BY하여 SUM(quantity) 집계. reports 페이지 월별 추이 차트용.

### View: top_products_by_outgoing
transactions에서 type='out'인 것을 product_id별 GROUP BY, SUM(quantity) DESC 정렬. Top 10 출고 빈도 차트용.

### View: daily_transaction_summary
최근 7일 기준 일별·type별 집계. 대시보드 요약 차트용.

## Activity Logging

activity_logs 기록은 **PostgreSQL trigger function**으로 구현하라 (애플리케이션 레벨 아님).
- products 테이블에 INSERT/UPDATE/DELETE after 트리거 설정.
- transactions 테이블에 INSERT after 트리거 설정.
- 트리거 함수는 OLD/NEW 레코드를 비교하여 details jsonb를 자동 생성.
- Supabase 대시보드에서 수동 수정해도 로그가 남는다 (단, user_id는 null).

## Conventions

- 모든 UI 텍스트는 한국어로 작성하라. 코드 주석·변수명은 영어.
- 페이지 데이터 페칭은 Server Component에서 수행하라. Client Component는 인터랙션이 필요한 경우만 사용.
- Supabase 클라이언트는 반드시 `src/lib/supabase/client.ts`(브라우저) 또는 `server.ts`(서버)에서 가져오라. 컴포넌트에서 직접 생성 금지.
- 입출고 처리 시 반드시 `process_transaction` RPC를 호출하라. 직접 UPDATE/INSERT 금지.
- 출고장 PDF: `src/templates/`에 React 컴포넌트로 작성. 한글 폰트는 `src/fonts/`에 .ttf 파일을 두고 `Font.register()`로 등록하라.
- PDF API Route(`api/pdf/delivery/route.ts`)에 반드시 `export const runtime = 'nodejs'`를 명시하라.
- 재고 부족 알림: process_transaction 반환값에 low_stock: true이면 대시보드 상단에 경고 배너 표시.
- 리포트 차트: recharts 사용. 대시보드는 daily_transaction_summary View, reports는 monthly_transaction_summary + top_products_by_outgoing View 조회.
- 모바일 간편 모드: URL `/m/...`. 데스크톱 사이드바 하단에 "모바일 모드" 링크, 모바일 상단에 "데스크톱 모드" 링크. 하단 네비게이션 바, 터치 타겟 최소 44px, 3단계(스캔→수량→완료) 제한.
- 입출고 내역 필터: 기간, 담당자, 품목, 카테고리, 구분(입고/출고). 필터는 URL 쿼리 파라미터로 관리.
- CSV 가져오기: 업로드 → 미리보기 → 확인 → 등록. 필수 컬럼: `제품명, 수량, 위치`. 선택: `분류, 단위, 최소수량`. 중복 제품명 — 건너뛰기: 행 무시. 덮어쓰기: name/category/unit/location/min_quantity만 업데이트. **quantity는 덮어쓰지 않는다** (입출고 이력 정합성 보호).
- CSV 내보내기: 파일명 `정원창고_재고목록_YYYYMMDD.csv` / `정원창고_입출고내역_YYYYMMDD.csv`.

## Auth & Roles

- Supabase Auth로 이메일/비밀번호 로그인.
- role은 profiles 테이블에서 관리. admin: 모든 CRUD + 사용자 관리 + 활동 로그 조회 + CSV 가져오기. user: 조회 + 입출고 등록 + CSV 내보내기만 가능.
- activity_logs는 admin만 조회 가능. user는 RLS로 차단.
- 모든 테이블에 RLS 정책을 적용하라. 인증되지 않은 접근 차단.
- 미들웨어(`src/middleware.ts`)에서 세션 검증. 미인증 시 로그인 페이지로 리다이렉트.

## Test Strategy

- RPC 테스트 (필수): process_transaction — 정상 입고, 정상 출고, 재고 부족 시 INSUFFICIENT_STOCK 예외 및 롤백, 음수 재고 방지 검증.
- CSV 파싱 테스트 (필수): 빈 행, 특수문자(쉼표 포함 제품명), 누락 컬럼, 초대형 파일(1000행+), 중복 제품명 건너뛰기/덮어쓰기 검증.
- 컴포넌트 테스트: 재고 부족 배너 표시 조건, 필터 URL 파라미터 동기화 검증.
- E2E는 범위 외. 단위·통합 테스트에 집중하라.

## Do NOT

- `components/ui/` 내 shadcn 컴포넌트를 직접 수정하지 마라 — 래퍼 컴포넌트로 커스터마이징.
- `database.types.ts`를 수동 편집하지 마라 — `supabase gen types` 명령으로만 갱신.
- products.quantity를 직접 UPDATE하지 마라 — 반드시 process_transaction RPC 경유.
- Supabase 서비스 롤 키(`service_role`)를 클라이언트 코드에 노출하지 마라.
- 한 컴포넌트 파일이 200줄을 넘기지 마라 — 초과 시 분리.
- activity_logs를 삭제·수정하지 마라 — INSERT only.
- activity_logs를 애플리케이션 코드에서 수동 INSERT하지 마라 — DB 트리거가 자동 처리.
- 모바일 간편 모드에 데스크톱 전용 기능(리포트, 활동 로그, 사용자 관리)을 넣지 마라.
- CSV 가져오기 시 미리보기 확인 없이 바로 DB에 INSERT하지 마라.
- CSV 덮어쓰기 시 quantity를 변경하지 마라 — 입출고 이력 정합성이 깨진다.
- PDF API Route에서 `export const runtime = 'edge'`를 사용하지 마라 — nodejs만 가능.
- Supabase JS 클라이언트 `.select()`로 GROUP BY 집계를 시도하지 마라 — View 또는 RPC를 사용하라.

## Environment

`.env.local`에 아래 변수 설정:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
`NEXT_PUBLIC_` 접두사가 붙은 변수만 브라우저에 노출됨. `SERVICE_ROLE_KEY`는 서버 전용.

## Deployment

- `main` 브랜치 push 시 Vercel 자동 배포.
- 환경 변수는 Vercel 대시보드 > Settings > Environment Variables에서 설정.
- Supabase 프로젝트 URL과 키는 Supabase 대시보드 > Settings > API에서 확인.

## Gotchas

- Supabase 무료 티어는 7일간 미사용 시 DB가 일시 정지됨. 대시보드에서 수동 재개 필요.
- @react-pdf/renderer는 서버 컴포넌트에서 직접 렌더링 불가. API Route에서 생성하여 응답하라.
- @react-pdf/renderer는 한글 폰트 미내장. `src/fonts/`에 .ttf 파일 배치 후 `Font.register({ family: 'NotoSansKR', src: '...' })` 필수.
- shadcn/ui 컴포넌트 추가 시 `pnpm dlx shadcn@latest add` 사용. `npx` 아님.
- Supabase RLS 미설정 시 모든 데이터가 공개됨. 테이블 생성 직후 RLS 반드시 활성화.
- CSV 내보내기 시 한글 깨짐 방지를 위해 UTF-8 BOM(`\uFEFF`)을 파일 앞에 추가하라.
- 재고 부족 알림은 대시보드 UI 배너만 제공. 이메일·푸시 미구현. 대시보드 미접속 시 부족 인지 불가 — 운영 시 정기 확인 필요.
- Supabase 대시보드에서 products 수동 수정 시 DB 트리거로 activity_logs 기록되나 user_id가 null. 가급적 앱을 통해서만 수정하라.
