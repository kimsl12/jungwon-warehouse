-- =============================================================================
-- Add products.variant — "same item, different attribute" differentiator
-- (e.g. 케이블타이 검정 vs 케이블타이 흰색). Unlike category/subcategory,
-- variant is the terminal differentiation level — two rows with same name +
-- different variant are *different* SKUs and should have independent stock.
--
-- - ADD COLUMN: nullable text. Existing rows default to NULL (no variant).
-- - bulk_import_products: duplicate check now considers (name, variant).
--   When variant is missing in CSV, NULL is matched against existing NULLs.
-- - search_products: include variant in the LIKE clauses so "검정" finds
--   variant='검정' products.
-- =============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant text;

COMMENT ON COLUMN public.products.variant IS
  '같은 품목의 색상/규격 변형 (예: 검정, 흰색). NULL이면 변형 없음.';

CREATE INDEX IF NOT EXISTS products_variant_idx ON public.products (variant);


-- -----------------------------------------------------------------------------
-- bulk_import_products — duplicate check on (name, variant)
-- -----------------------------------------------------------------------------
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
  v_name     text;
  v_variant  text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    v_name    := v_item->>'name';
    v_variant := v_item->>'variant';

    -- Duplicate check: match name, and match variant treating NULL = NULL
    IF EXISTS (
      SELECT 1 FROM public.products
       WHERE name = v_name
         AND variant IS NOT DISTINCT FROM v_variant
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.products (
      name, category, subcategory, variant, unit,
      quantity, min_quantity, location, sort_order
    )
    VALUES (
      v_name,
      v_item->>'category',
      v_item->>'subcategory',
      v_variant,
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


-- -----------------------------------------------------------------------------
-- search_products — variant is searchable
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_products(
  p_query    text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS SETOF public.products
LANGUAGE sql STABLE SECURITY DEFINER
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
  ORDER BY p.sort_order, natural_sort_key(p.name), p.variant NULLS FIRST;
$$;
