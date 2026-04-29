-- create_material_request 를 확장 — is_urgent + urgent_reason 파라미터 추가.
-- 기존 시그니처는 drop 하고 새 시그니처로 교체.

DROP FUNCTION IF EXISTS public.create_material_request(uuid, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.create_material_request(
  p_site_id        uuid,
  p_items          jsonb,
  p_note           text,
  p_user_id        uuid,
  p_is_urgent      boolean DEFAULT false,
  p_urgent_reason  text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_request_id uuid;
  v_item       jsonb;
  v_idx        integer := 0;
  v_product    public.products;
  v_qty        integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF NOT public.is_admin() AND NOT public.is_site_assigned(p_site_id) THEN
    RAISE EXCEPTION 'SITE_NOT_ASSIGNED';
  END IF;

  IF p_site_id IS NULL THEN
    RAISE EXCEPTION 'SITE_REQUIRED';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ITEMS_REQUIRED';
  END IF;

  INSERT INTO public.material_requests (site_id, created_by, status, note, is_urgent, urgent_reason)
  VALUES (p_site_id, p_user_id, 'submitted', p_note, coalesce(p_is_urgent, false), p_urgent_reason)
  RETURNING id INTO v_request_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_idx := v_idx + 1;
    v_qty := (v_item->>'requested_quantity')::integer;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    SELECT * INTO v_product
      FROM public.products
     WHERE id = (v_item->>'product_id')::uuid;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    INSERT INTO public.material_request_items (
      request_id, product_id, product_name, product_variant, unit,
      requested_quantity, note, sort_order
    ) VALUES (
      v_request_id,
      v_product.id,
      v_product.name,
      v_product.variant,
      v_product.unit,
      v_qty,
      v_item->>'note',
      v_idx
    );
  END LOOP;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_material_request(uuid, jsonb, text, uuid, boolean, text) TO authenticated;
