-- Add subcategory column + natural sort function for numeric ordering

-- 1. Add subcategory to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory text;

-- 2. Natural sort key: pads numbers to 10 digits for correct numeric ordering
-- "16 mm" → "0000000016 mm", "104 mm" → "0000000104 mm"
CREATE OR REPLACE FUNCTION natural_sort_key(input text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT string_agg(
    CASE
      WHEN part ~ '^\d+$' THEN lpad(part, 10, '0')
      ELSE part
    END,
    ''
  )
  FROM regexp_split_to_table(input, '(?<=\D)(?=\d)|(?<=\d)(?=\D)') AS t(part);
$$;

-- 3. Update search_products with natural sort
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
  ORDER BY
    p.category COLLATE "ko-x-icu",
    p.subcategory COLLATE "ko-x-icu" NULLS LAST,
    natural_sort_key(p.name);
$$;

-- 4. Update low stock with natural sort
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS SETOF products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM products
  WHERE min_quantity > 0
    AND quantity <= min_quantity
  ORDER BY
    category COLLATE "ko-x-icu",
    natural_sort_key(name);
$$;

-- 5. Update bulk_import to support subcategory
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

    INSERT INTO public.products (name, category, subcategory, unit, quantity, min_quantity, location)
    VALUES (
      v_item->>'name',
      v_item->>'category',
      v_item->>'subcategory',
      v_item->>'unit',
      coalesce((v_item->>'quantity')::integer, 0),
      coalesce((v_item->>'min_quantity')::integer, 0),
      v_item->>'location'
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped);
END;
$$;
