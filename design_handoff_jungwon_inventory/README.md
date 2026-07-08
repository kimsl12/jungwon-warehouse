# Handoff: 정원전기 재고관리 시스템 (물류창고 + 모바일)

## Overview

전기자재 도매상 / 현장 직원 / 창고 관리자를 위한 **재고관리 SaaS** 디자인입니다. 두 가지 컨텍스트를 모두 다룹니다:

- **데스크톱 웹 (사무실/창고 관리자)** — 1280px+ 사이드바 + 다중 카드 레이아웃, 대시보드·재고·입출고·발주·공급업체·현장·리포트·직원/권한
- **모바일 웹 (현장 직원)** — 390px 폭 가정, 하단 탭 네비게이션 + 바코드 스캔 + 자재 신청

라이트/다크 모드 모두 지원합니다.

---

## About the Design Files

`design_files/` 폴더의 파일들은 **프로토타입 (HTML + 인라인 JSX, 브라우저 Babel 변환)** 입니다. **그대로 복사해서 쓸 수 있는 코드가 아니라, 디자인 의도를 충실히 보여주는 시각적 레퍼런스**입니다.

타깃 스택(**Next.js 15 App Router + shadcn/ui + Tailwind CSS + lucide-react + recharts**)에 맞게 **다시 구현**해야 합니다. 핵심 변환:

| 프로토타입 | 타깃 (Next.js 15 + shadcn) |
|---|---|
| `window.UI = { Card, Btn, ... }` 전역 | `src/components/ui/` (shadcn 자동 생성, 직접 수정 금지) + `src/components/` (래퍼) |
| 인라인 `style={{...}}` | Tailwind 클래스 + `cn()` 헬퍼 |
| CSS 변수 (`--c-brand-500` 등) | `globals.css` 그대로 복사 + `tailwind.config.ts`의 `theme.extend.colors`로 노출 |
| 인라인 SVG 아이콘 | `lucide-react` 동등 아이콘으로 교체 |
| 자체 `Sparkline`/`MiniBars` SVG | `recharts` `<LineChart>` / `<BarChart>` |
| `useState`만 사용한 페이지 전환 | App Router (`app/(app)/inventory/page.tsx` 등) |
| Mock 데이터 (인라인) | `src/lib/mock/*.ts` 또는 RSC fetch + Drizzle/Prisma |
| `[data-theme='dark']` | `next-themes` + Tailwind `dark:` |

---

## Fidelity

**High-fidelity (hifi)** — 색상·타이포·간격·인터랙션 모두 최종안 의도. 픽셀 단위로 재현해주세요. 색상 hex와 spacing 값은 모두 `tokens.css`에 명세되어 있습니다.

---

## 추천 프로젝트 구조 (Next.js 15 App Router)

```
src/
├── app/
│   ├── layout.tsx                 # ThemeProvider, Pretendard 폰트, <html lang="ko">
│   ├── globals.css                # tokens.css 복사 + Tailwind directives
│   ├── (app)/                     # 데스크톱 레이아웃 (사이드바 + 탑바)
│   │   ├── layout.tsx             # <Sidebar/> + <TopBar/> + {children}
│   │   ├── page.tsx               # 대시보드
│   │   ├── inventory/page.tsx
│   │   ├── inbound/page.tsx
│   │   ├── outbound/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── sites/page.tsx
│   │   ├── suppliers/page.tsx
│   │   ├── reports/page.tsx
│   │   └── staff/page.tsx
│   └── (mobile)/                  # 모바일 레이아웃 (하단 탭) — 또는 미디어 쿼리로 동일 라우트
│       ├── layout.tsx
│       ├── m/page.tsx             # 홈
│       ├── m/inventory/page.tsx
│       ├── m/scan/page.tsx
│       └── m/requests/page.tsx
├── components/
│   ├── ui/                        # shadcn 자동 생성 (button, card, badge, input, table, tabs, dialog, sheet, dropdown-menu, avatar, progress, separator, scroll-area, command)
│   ├── chrome/
│   │   ├── sidebar-nav.tsx        # 데스크톱 사이드바 (Client)
│   │   ├── top-bar.tsx
│   │   ├── mobile-top.tsx
│   │   └── mobile-nav.tsx         # 하단 탭바
│   ├── shared/
│   │   ├── kpi-card.tsx
│   │   ├── status-badge.tsx       # tone={success|info|warning|danger|brand|neutral}
│   │   ├── sparkline.tsx          # recharts 래퍼
│   │   ├── mini-bars.tsx
│   │   ├── stock-bar.tsx          # 재고 잔량 게이지
│   │   └── empty-state.tsx
│   └── features/
│       ├── inventory/...
│       ├── inbound/...
│       ├── outbound/...
│       ├── orders/...
│       ├── sites/...
│       ├── suppliers/...
│       ├── reports/...
│       └── staff/...
├── lib/
│   ├── mock/                      # 초기에는 mock, 추후 DB로 교체
│   │   ├── inventory.ts
│   │   ├── orders.ts
│   │   ├── suppliers.ts
│   │   └── staff.ts
│   ├── utils.ts                   # cn()
│   └── format.ts                  # 통화/숫자/날짜 포맷터 (KRW, ko-KR)
└── styles/
    └── tokens.css                 # 색상/타이포/간격 변수
```

### App Router에서 인터랙션 가이드

- **RSC 우선** — 페이지 단위는 모두 Server Component. 데이터 fetch는 RSC에서.
- **Client Component는 좁게** — 사이드바·탑바·필터바·폼·테이블 행 클릭처럼 상태가 필요한 곳만 `'use client'`. 페이지 전체를 client로 만들지 마세요.
- **테마 전환** — `next-themes`를 사용하고 `<html className={theme}>` 또는 `data-theme` 속성으로 토큰 스왑. 사이드바 하단 토글 버튼은 client 컴포넌트.

---

## Design Tokens

**`design_files/tokens.css`를 그대로 `app/globals.css`에 복사**하고, Tailwind에서 사용 가능하도록 `tailwind.config.ts`에 매핑하세요.

### 핵심 컬러 (light)

| 토큰 | hex | 용도 |
|---|---|---|
| `--c-brand-500` | `#C96442` | **Primary** — Claude의 따뜻한 테라코타. 주요 액션, 활성 네비, 강조 |
| `--c-brand-600` | `#B5482A` | hover/pressed primary |
| `--c-brand-50` | `#FBEFE6` | 활성 메뉴 배경, 아이콘 배경 |
| `--c-brand-100` | `#F4D9C4` | 선택된 행 배경 (light) |
| `--bg-app` | `#FAF7F2` (cream-50) | 페이지 배경 |
| `--bg-surface` | `#FFFFFF` | 카드/테이블 |
| `--bg-muted` | `#F4EFE6` (cream-100) | 테이블 헤더, 토글 트랙, hover |
| `--fg-default` | `#232220` (n-800) | 본문 텍스트 |
| `--fg-muted` | `#6B6862` (n-500) | 보조 텍스트 |
| `--fg-subtle` | `#8E8A82` (n-400) | placeholder, disabled |
| `--border-subtle` | `#ECE9E2` | 카드/행 구분선 |
| `--border-default` | `#DBD7CE` | 입력 필드 |
| `--c-success` | `#4F8A55` | 정상 재고, 완료 상태 |
| `--c-warning` | `#C28B2B` | 부족 임박, 대기 |
| `--c-danger` | `#B5482A` | 부족, 긴급, 결품 |
| `--c-info` | `#4A6E8E` | 진행 중, 운송 중 |

### 다크 모드

| 토큰 | hex |
|---|---|
| `--bg-app` | `#1A1816` |
| `--bg-surface` | `#232220` |
| `--bg-elevated` | `#2A2926` |
| `--bg-muted` | `#1F1E1C` |
| `--fg-default` | `#F0EDE7` |
| `--fg-muted` | `#A8A39A` |
| `--fg-brand` | `#E0A074` (brand-300, 다크에선 더 밝게) |

### Tailwind 매핑 예시 (`tailwind.config.ts`)

```ts
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // shadcn 표준 토큰 (background/foreground/primary/...) 은 hsl()로
        background: 'var(--bg-app)',
        foreground: 'var(--fg-default)',
        card: { DEFAULT: 'var(--bg-surface)', foreground: 'var(--fg-default)' },
        muted: { DEFAULT: 'var(--bg-muted)', foreground: 'var(--fg-muted)' },
        primary: { DEFAULT: 'var(--c-brand-500)', foreground: 'var(--fg-on-brand)' },
        border: 'var(--border-subtle)',
        input: 'var(--border-default)',
        ring: 'var(--c-brand-500)',
        // 자체 확장
        brand: {
          50: 'var(--c-brand-50)', 100: 'var(--c-brand-100)',
          500: 'var(--c-brand-500)', 600: 'var(--c-brand-600)',
        },
        success: { DEFAULT: 'var(--c-success)', bg: 'var(--c-success-bg)' },
        warning: { DEFAULT: 'var(--c-warning)', bg: 'var(--c-warning-bg)' },
        danger:  { DEFAULT: 'var(--c-danger)',  bg: 'var(--c-danger-bg)'  },
        info:    { DEFAULT: 'var(--c-info)',    bg: 'var(--c-info-bg)'    },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',  // 6px
        md: 'var(--radius-md)',  // 10px
        lg: 'var(--radius-lg)',  // 14px
        xl: 'var(--radius-xl)',  // 20px
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['Copernicus', 'Source Serif Pro', 'Noto Serif KR', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
};
```

### Spacing scale

`--space-1`(4) `--space-2`(8) `--space-3`(12) `--space-4`(16) `--space-5`(20) `--space-6`(24) `--space-8`(32) `--space-10`(40) `--space-12`(48) — Tailwind 기본 스케일과 1:1 호환됩니다 (`p-1` = 4px).

### Typography

- **본문 / UI**: `font-sans` = Pretendard Variable (한글 가독성). `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css')` — 또는 `next/font/local` 권장.
- **디스플레이 (큰 숫자, 페이지 제목)**: `font-display` = Copernicus / Source Serif Pro / Noto Serif KR — 세리프, `letter-spacing: -0.01em`, weight 500–600.
- **숫자 (테이블, KPI)**: `font-mono` 또는 `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`).

타이포 스케일 (실제 사용된 값):
- Page title (display): 24–28px / 600 / -0.01em
- Card title (display): 15–17px / 600
- Body: 13–14px / 400–500
- Label/eyebrow: 11–12px / 500 / uppercase / 0.04em letter-spacing
- KPI big: 30–36px / 600 (display, tabular)

---

## Screens / Views

각 화면의 의도와 핵심 요소만 정리합니다 — 정확한 마크업은 `design_files/desktop-screens.jsx`, `desktop-screens-2.jsx`, `mobile-screens.jsx`를 참고하세요.

### 데스크톱 (1280×820)

#### 1. Dashboard (`/`)
- **상단 KPI 4개** (총 재고가치, SKU 수, 부족 SKU, 오늘 입출고 차) — `<KPICard>` with delta vs 전주
- **2-column grid (1fr 1fr)**:
  - 왼쪽: 입출고 추세 차트 (recharts `<LineChart>`, 30일)
  - 오른쪽: 부족 SKU 리스트 + 진행 게이지
- **하단**: 최근 활동 타임라인 + 오늘의 작업 리스트
- **컴포넌트**: `KPICard`, `Sparkline`(미니), `StockBar`, `ActivityItem`

#### 2. Inventory 재고 목록 (`/inventory`)
- **검색 + 필터바** — `Input` (검색), 카테고리/위치/상태 필터 칩, 정렬
- **테이블**: SKU 코드 (mono), 품명, 카테고리, 현재고/안전재고 (게이지 inline), 위치, 단가, 최근 변동
- **상태 뱃지**: 정상(success) / 부족 임박(warning) / 결품(danger)
- **행 클릭** → 사이드 시트(`<Sheet>`)로 SKU 상세

#### 3. Inbound 입고 관리 (`/inbound`)
- 좌: 입고 예정/진행/완료 리스트 (탭)
- 우: 빠른 입고 폼 (PO 선택, SKU 검색, 수량, 위치)
- 바코드 스캔 버튼 → 모바일 스캔 페이지로 딥링크 가능

#### 4. Outbound 출고 관리 (`/outbound`) ★새로 추가
- 좌: 출고 큐 카드 — 현장명/담당자/긴급여부, 품목 테이블, 상태(피킹중/대기/완료)
- 상단 KPI strip: 오늘 출고 예정, 피킹 중, 완료, 금일 출고가
- 우: 빠른 출고 폼 + 최근 7일 출고량 (수평 막대)
- 액션: "송장 인쇄" / "출고 확정" 버튼

#### 5. Orders 발주/주문 (`/orders`)
- 발주 진행 칸반 (드래프트 → 승인대기 → 발주됨 → 운송중 → 입고완료)
- 또는 테이블 + 필터

#### 6. Sites + Requests 현장/자재신청 (`/sites`)
- 좌: 활성 현장 카드 (3곳: 강남/종로/연희동) — 공정률, 담당자, 활성 신청 수
- 우: 자재 신청 인박스 — 승인/거절 인라인 액션

#### 7. Suppliers 공급업체 (`/suppliers`) ★새로 추가
- 좌: 협력사 테이블 — 등급(A/B/C), 담당자, 취급품목 수, 평균 리드타임, YTD 거래액, 거래 추이 sparkline
- 우 (행 선택 시): 업체 상세 카드 + 최근 발주 내역 + 주요 취급 품목
- 액션: "발주 보내기" / "상세 보기"

#### 8. Reports 리포트 (`/reports`)
- 기간 선택 + 내보내기
- 카드 그리드: 재고 회전율, 카테고리별 거래액(도넛/막대), 월별 입출고(라인), Top SKU
- 모두 recharts

#### 9. Staff & Permissions 직원·권한 (`/staff`) ★새로 추가
- **3 탭 (`<Tabs>`)**:
  1. **직원 목록** — 7명, 이름/이메일/역할 뱃지/부서/상태/최근 접속 + 일괄 초대 액션
  2. **역할** — 4개 역할 × 8개 권한 매트릭스 (체크/대시 셀로 표시), 역할별 색 막대
  3. **권한 변경 로그** — 감사 로그 타임라인 (누가 / 무엇을 / 언제)
- **역할**: 관리자, 창고관리자, 구매, 현장직원
- **권한 축**: 재고조회/재고수정/입고등록/발주작성/발주승인/공급업체관리/리포트조회/직원관리

### 모바일 (390×780, 현장 직원용)

iPhone 14 가정. 안드로이드도 동일 디자인 + safe-area 처리.

#### M1. Home (`/m`)
- 인사 + 검색바
- 빠른 액션 그리드 (스캔/입고/신청/내 작업)
- 오늘의 카드 (할당 작업, 최근 활동)

#### M2. Inventory (`/m/inventory`)
- 큰 검색바 + 카테고리 칩
- 카드 리스트 (썸네일 자리, 품명, SKU, 잔량 게이지, 위치 코드)

#### M3. Scan (`/m/scan`)
- 풀스크린 카메라 뷰파인더 (실제론 placeholder 박스 + 스캔 가이드 라인 + 코너 마커)
- 하단 시트: 스캔된 SKU 정보 + "입고/출고/위치이동" 액션
- 상단 헤더는 숨김 (몰입형)

#### M4. Requests 자재 신청 (`/m/requests`)
- 진행 중/완료 탭
- 신청 카드 (현장, 품목 N개, 상태, 시간)
- FAB(`fixed bottom-20 right-4`) → 신규 신청 폼 시트

#### 하단 탭바 (모든 모바일 화면 공통, scan 제외 옵션)
홈 / 재고 / **스캔(가운데, 큼/primary)** / 신청 / 내 정보

---

## Components — shadcn 매핑

| 자체 컴포넌트 | shadcn 매핑 + 커스텀 |
|---|---|
| `Btn` | `Button` (variants: default → primary brand, secondary, ghost, outline) |
| `Card` | `Card` + `CardHeader/Content/Footer` |
| `StatusBadge` | `Badge` 래퍼, `tone` prop으로 컬러 매핑 |
| `Input` (icon prefix) | `Input` + 절대 위치 lucide 아이콘, `pl-9` |
| `IconBtn` | `Button` `size="icon"` `variant="ghost"` |
| `Avatar` (이니셜) | `Avatar` + `AvatarFallback` |
| `KPI` | 자체 (`Card` 위에 build), recharts `<Sparkline>` 포함 |
| `Sparkline` / `MiniBars` | recharts `<ResponsiveContainer>` + `<LineChart>` / `<BarChart>` |
| 사이드바 | shadcn `sidebar` 또는 자체 (현 디자인은 자체 build 권장) |
| 모바일 시트/폼 | `Sheet` (side="bottom") |
| 필터 드롭다운 | `DropdownMenu` 또는 `Popover` + `Command` |
| 권한 매트릭스 | 일반 `<table>` + `Check`/`Minus` 셀 — shadcn `Table` 사용 가능 |
| 역할 뱃지 | `Badge` with `tone` |
| 다크 토글 | `next-themes` + `Button` |

### Status tone → 컬러 매핑

`StatusBadge` `tone` prop:

```tsx
const toneStyles = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger:  'bg-danger-bg text-danger',
  info:    'bg-info-bg text-info',
  brand:   'bg-brand-50 text-brand-600',
  neutral: 'bg-muted text-muted-foreground',
};
```

`dot` 옵션 — 텍스트 앞에 6×6 dot.

---

## Interactions & Behavior

- **Theme toggle** — 사이드바 하단 / 모바일 탑바 trailing 아이콘. `next-themes`로 light/dark 전환, 200ms 색 전환 트랜지션.
- **Sidebar collapse** — 232px ↔ 64px 토글, `localStorage` 기억.
- **Row hover** — `hover:bg-muted cursor-pointer`.
- **테이블 행 클릭** — Sheet 또는 `/inventory/[sku]` 라우트.
- **모바일 FAB** — `fixed bottom-20 right-4 z-40 size-14 rounded-full shadow-lg`.
- **스캔 페이지** — 진입 시 카메라 권한 요청 (실제 구현 시 `navigator.mediaDevices.getUserMedia`). 디자인엔 placeholder.
- **필터 칩** — 단일/다중 선택, 활성 상태는 `bg-brand-50 border-brand-500 text-brand-700`.
- **부족 재고 게이지** — `<Progress>` 또는 자체 `<StockBar current={x} safe={y} />` — 비율에 따라 색상 변경 (≥100% green, 60-99% warning, <60% danger).

---

## State Management

- **로컬 UI 상태** — `useState` (사이드바 collapse, 필터, 모달 open).
- **서버 상태 / 데이터** — RSC fetch + `revalidatePath` / `revalidateTag`. 클라이언트 캐싱 필요 시 `@tanstack/react-query`.
- **테마** — `next-themes`.
- **Form** — `react-hook-form` + `zod` + shadcn `Form`.
- **권한** — middleware에서 role 체크, RSC에서 `getCurrentUser()` 헬퍼로 권한 게이트.

---

## Mock Data 구조

`design_files/chrome.jsx`의 `window.MOCK`을 참고 — SKU/입고/발주/공급업체/현장 등 샘플 데이터가 정리되어 있어요. `src/lib/mock/*.ts`로 옮긴 후, 점진적으로 DB(Drizzle/Prisma + Postgres)로 교체하세요.

핵심 도메인 타입 예시:

```ts
type SKU = {
  code: string;            // 'JW-CB-2.5SQ'
  name: string;            // '2.5SQ 전선 케이블'
  category: '전선/케이블' | '조명' | '제어기기' | '부속자재';
  unit: 'EA' | 'm' | 'BOX';
  current: number;
  safe: number;            // 안전재고
  location: string;        // 'A-01-03'
  unitPrice: number;       // KRW
  supplierId: string;
};

type OutboundOrder = {
  id: string;              // 'OUT-2026-0421-04'
  site: string;
  manager: string;
  items: { sku: string; name: string; qty: number; unit: string }[];
  status: '대기' | '피킹중' | '출고완료';
  priority: '일반' | '긴급';
  createdAt: Date;
};

type Supplier = {
  code: string;            // 'SUP-001'
  name: string;            // '대한전선'
  tier: 'A' | 'B' | 'C';
  contact: { name: string; phone: string; email?: string };
  itemCount: number;
  avgLeadTimeDays: number;
  ytdAmount: number;       // KRW
};

type StaffMember = {
  email: string;
  name: string;
  role: '관리자' | '창고관리자' | '구매' | '현장직원';
  department: string;
  active: boolean;
  lastLoginAt: Date;
};

type Permission =
  | 'inventory:read' | 'inventory:write'
  | 'inbound:create'
  | 'order:create' | 'order:approve'
  | 'supplier:manage'
  | 'report:read'
  | 'staff:manage';
```

---

## Assets

- **아이콘** — 모두 lucide-react 동등으로 교체. 매핑:
  - `Icon.Dashboard` → `LayoutDashboard`
  - `Icon.Box` → `Package` (또는 `Box`)
  - `Icon.ArrowDown/Up` → `ArrowDownToLine` / `ArrowUpFromLine`
  - `Icon.Truck` → `Truck`
  - `Icon.Hard` → `HardHat`
  - `Icon.Send` → `Send`
  - `Icon.Building` → `Building2`
  - `Icon.Chart` → `BarChart3`
  - `Icon.Activity` → `Activity`
  - `Icon.Users` → `Users` / `UsersRound`
  - `Icon.Bell` → `Bell`
  - `Icon.Scan` → `ScanLine` / `ScanBarcode`
  - `Icon.Sun/Moon` → `Sun` / `Moon`
  - `Icon.Search` → `Search`
- **로고** — `design_files/ui.jsx`의 `Icon.Logo` 참고 (정육면체 박스 형태). 실제 정원전기 브랜드 로고를 받으면 교체.
- **이미지** — 현재 placeholder만. 실제 SKU 사진은 도입 시 `/public/sku/{sku}.jpg`.

---

## Files (in `design_files/`)

| 파일 | 내용 |
|---|---|
| `index.html` | 엔트리, 스크립트 로드 순서 |
| `tokens.css` | **★ 핵심** — 모든 디자인 토큰 (색상/타이포/간격/그림자/radius). `globals.css`에 그대로 복사 |
| `ui.jsx` | 공용 UI 컴포넌트 (Btn, Card, Input, StatusBadge, Avatar, Sparkline, MiniBars, KPI, Frame, IconBtn, Icon set) |
| `chrome.jsx` | SidebarNav (데스크톱), TopBar, MobileTop, MobileNav (하단 탭), MOCK 데이터 |
| `desktop-screens.jsx` | Dashboard, Inventory, Inbound, Orders, Sites, Reports |
| `desktop-screens-2.jsx` | **★새 화면** — Outbound, Suppliers, Staff (3 탭 포함) |
| `mobile-screens.jsx` | MobileHome, MobileInventory, MobileScan, MobileRequests |
| `app.jsx` | 라우팅 (사이드바 nav 키 → 화면 매핑), DesignCanvas 아트보드 구성 |

`design_files/index.html`을 브라우저로 직접 열면 디자인 캔버스에서 모든 화면을 한눈에 볼 수 있습니다 (인터랙션도 동작 — 사이드바 클릭, 테마 토글 등).

---

## 구현 순서 추천

1. **토큰 셋업** — `globals.css` + `tailwind.config.ts`. 다크 모드 동작 확인.
2. **shadcn 컴포넌트 install** — `button card input badge table tabs dialog sheet dropdown-menu avatar progress separator scroll-area command form select`.
3. **Chrome 먼저** — `(app)/layout.tsx`로 사이드바 + 탑바. 빈 페이지로 라우팅 동작 확인.
4. **공용 컴포넌트** — `KPICard`, `StatusBadge`, `Sparkline`, `StockBar`.
5. **화면 구현** — Dashboard → Inventory → 나머지 (mock 데이터부터).
6. **모바일 라우트** — `/m/*` 별도 레이아웃 + 하단 탭바.
7. **다크 모드 검수** — 모든 화면.
8. **데이터 연결** — mock → Drizzle/Prisma + Postgres + RSC fetch.
9. **권한 게이트** — middleware + RSC 헬퍼.

---

## 참고

- 한글 가독성: Pretendard Variable. `next/font/local`로 셀프호스팅 권장 (CDN보다 빠름).
- 통화 포맷: `Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' })` — 카드 KPI는 `₩4.2M`처럼 축약 표시.
- 날짜 포맷: `date-fns/ko` 또는 `Intl.DateTimeFormat('ko-KR')`. 상대시간 ("10분 전")은 `formatDistanceToNow`.
- 접근성: 사이드바·하단탭에 `aria-label`, 테이블에 `<caption>` 또는 `aria-labelledby`, 다크 모드 대비 검수.

질문이 생기면 `design_files/index.html`을 먼저 열어보고 — 의도가 가장 명확하게 보입니다.
