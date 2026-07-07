-- =============================================================================
-- 품목 비활성화(단종 처리) — products.is_active
--
-- 입출고 이력이 있는 품목은 삭제가 막혀 있는데(FK RESTRICT, 정상), 단종 품목을
-- 목록·검색에서 숨길 수단이 없었다. soft-deactivate 컬럼을 추가하고
-- search_products 가 기본적으로 활성 품목만 반환하도록 한다.
-- =============================================================================

ALTER TABLE public.products
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.products.is_active IS
  '비활성(단종) 품목 숨김용. false 면 검색·등록 흐름에서 제외, 이력은 유지.';

-- search_products 에 p_include_inactive 파라미터 추가.
-- 시그니처가 바뀌므로 기존 (text, text) 오버로드를 제거해야
-- PostgREST 함수 해석 모호성이 생기지 않는다.
DROP FUNCTION IF EXISTS public.search_products(text, text);

CREATE OR REPLACE FUNCTION public.search_products(
  p_query            text    DEFAULT NULL,
  p_category         text    DEFAULT NULL,
  p_include_inactive boolean DEFAULT false
)
RETURNS SETOF public.products
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, auth
AS $$
  SELECT p.*
  FROM public.products p
  WHERE (
    p_query IS NULL OR p_query = ''
    OR p.name        ILIKE '%' || p_query || '%'
    OR p.category    ILIKE '%' || p_query || '%'
    OR p.subcategory ILIKE '%' || p_query || '%'
    OR p.variant     ILIKE '%' || p_query || '%'
    OR EXISTS (
      SELECT 1 FROM public.product_aliases pa
      WHERE pa.product_id = p.id
        AND pa.alias ILIKE '%' || p_query || '%'
    )
  )
  AND (p_category IS NULL OR p.category = p_category)
  AND (p_include_inactive OR p.is_active)
  ORDER BY p.sort_order, natural_sort_key(p.name), p.variant NULLS FIRST;
$$;

GRANT EXECUTE ON FUNCTION public.search_products(text, text, boolean) TO authenticated;

-- 저재고 목록(재고 페이지 기본 화면·대시보드)에서도 비활성 품목 제외 —
-- 단종 품목이 저재고 목록에 계속 남는 것이 비활성화 기능의 핵심 해소 대상.
-- (기존 하드닝 유지: SECURITY INVOKER + search_path 고정)
CREATE OR REPLACE FUNCTION public.get_low_stock_products()
RETURNS SETOF public.products
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT *
  FROM products
  WHERE min_quantity > 0
    AND quantity <= min_quantity
    AND is_active
  ORDER BY sort_order, natural_sort_key(name);
$$;
