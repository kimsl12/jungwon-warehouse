-- 자재 신청 템플릿 확장 — 대/소분류 + 다중 변수 + 산출 수식.
--
-- 정책:
--   - 공용 템플릿 (is_public=true): category/subcategory 입력 권장. 대/소분류
--     2단 드롭다운으로 작업자가 선택하므로 두 컬럼은 NULL 가능하지만 의미상 채워야 함.
--   - 개인 템플릿 (is_public=false): category/subcategory NULL, variables NULL → 기존
--     자유 구성 동작 유지.
--   - variables: [{name, label, unit, default}] 배열. 변수가 없으면 NULL 또는 빈 배열.
--   - items 의 각 element 는 다음 중 하나의 형태:
--       { product_id, formula: "ceil(L/3)+N*2" }   ← 산출 수식
--       { product_id, quantity: 1 }                ← 고정 수량 (기존 호환)
--     formula 가 있으면 quantity 는 무시. 둘 다 없으면 잘못된 데이터.
--   - 표현식 평가는 application(server action) 에서 화이트리스트 토큰만 허용.
--     DB 는 raw 문자열만 저장.

ALTER TABLE public.request_templates
  ADD COLUMN category    text,
  ADD COLUMN subcategory text,
  ADD COLUMN variables   jsonb;

COMMENT ON COLUMN public.request_templates.category IS
  '공용 템플릿 대분류 (예: 전기 배관, 전선 포설). 개인 템플릿은 NULL.';
COMMENT ON COLUMN public.request_templates.subcategory IS
  '공용 템플릿 소분류 (예: ST 25mm 노출 시공). 개인 템플릿은 NULL.';
COMMENT ON COLUMN public.request_templates.variables IS
  '템플릿 변수 정의 [{name, label, unit, default}]. items 의 formula 가 참조.';

-- 공용 템플릿 카테고리 조회 인덱스 (드롭다운 옵션 빠른 산출)
CREATE INDEX request_templates_public_category_idx
  ON public.request_templates (category, subcategory)
  WHERE is_public AND category IS NOT NULL;
