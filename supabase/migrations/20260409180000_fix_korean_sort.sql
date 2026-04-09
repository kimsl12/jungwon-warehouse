-- Fix Korean sorting in search_products and get_low_stock_products RPCs.
-- Default PostgreSQL collation (C or en_US) doesn't sort Korean properly.
-- Use ICU collation "ko-x-icu" for correct 가나다 ordering.

CREATE OR REPLACE FUNCTION search_products(
  p_query    text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS SETOF products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT p.*
  FROM products p
  WHERE (
    p_query IS NULL OR p_query = ''
    OR p.name ILIKE '%' || p_query || '%'
    OR EXISTS (
      SELECT 1 FROM product_aliases pa
      WHERE pa.product_id = p.id
        AND pa.alias ILIKE '%' || p_query || '%'
    )
  )
  AND (p_category IS NULL OR p.category = p_category)
  ORDER BY p.name COLLATE "ko-x-icu";
$$;

CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS SETOF products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM products
  WHERE min_quantity > 0
    AND quantity <= min_quantity
  ORDER BY name COLLATE "ko-x-icu";
$$;
