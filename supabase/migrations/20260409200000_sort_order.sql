-- Add sort_order column to preserve original spreadsheet row order

ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

CREATE INDEX products_sort_order_idx ON products(sort_order);

-- Update search_products to sort by sort_order
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
    OR p.category ILIKE '%' || p_query || '%'
    OR p.subcategory ILIKE '%' || p_query || '%'
    OR EXISTS (
      SELECT 1 FROM product_aliases pa
      WHERE pa.product_id = p.id
        AND pa.alias ILIKE '%' || p_query || '%'
    )
  )
  AND (p_category IS NULL OR p.category = p_category)
  ORDER BY p.sort_order, natural_sort_key(p.name);
$$;

-- Update low stock to sort by sort_order
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS SETOF products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM products
  WHERE min_quantity > 0
    AND quantity <= min_quantity
  ORDER BY sort_order, natural_sort_key(name);
$$;

-- Update bulk_import to support sort_order
CREATE OR REPLACE FUNCTION public.bulk_import_products(
  p_products jsonb,
  p_user_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_item     jsonb;
  v_inserted integer := 0;
  v_skipped  integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    IF EXISTS (SELECT 1 FROM public.products WHERE name = v_item->>'name') THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.products (name, category, subcategory, unit, quantity, min_quantity, location, sort_order)
    VALUES (
      v_item->>'name',
      v_item->>'category',
      v_item->>'subcategory',
      v_item->>'unit',
      coalesce((v_item->>'quantity')::integer, 0),
      coalesce((v_item->>'min_quantity')::integer, 0),
      v_item->>'location',
      coalesce((v_item->>'sort_order')::integer, 0)
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped);
END;
$$;
