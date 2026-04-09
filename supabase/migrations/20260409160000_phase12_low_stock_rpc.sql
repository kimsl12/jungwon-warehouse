-- Phase 12: Low-stock products RPC for search-first inventory mode

CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS SETOF products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM products
  WHERE min_quantity > 0
    AND quantity <= min_quantity
  ORDER BY name;
$$;

COMMENT ON FUNCTION get_low_stock_products IS '재고 부족 품목 목록 (quantity <= min_quantity). 검색 우선 모드에서 기본 표시용.';

GRANT EXECUTE ON FUNCTION get_low_stock_products() TO authenticated;
