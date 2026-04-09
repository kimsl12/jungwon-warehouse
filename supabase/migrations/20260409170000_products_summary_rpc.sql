-- Products summary RPC for dashboard KPI (avoids 1000-row limit)
CREATE OR REPLACE FUNCTION get_products_summary()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_products', count(*),
    'total_quantity', coalesce(sum(quantity), 0),
    'low_stock_count', count(*) FILTER (WHERE min_quantity > 0 AND quantity <= min_quantity)
  )
  FROM products;
$$;

GRANT EXECUTE ON FUNCTION get_products_summary() TO authenticated;
