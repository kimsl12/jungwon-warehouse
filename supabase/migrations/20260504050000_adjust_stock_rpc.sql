-- 재고 보정(adjust) RPC — 입출고 transactions 와 분리된 admin 전용
-- 직접 quantity 세팅. 시스템 도입 초기 또는 실재고 정합성 맞출 때 사용.
--
-- 핵심 분리 원칙:
--   - transactions 에 row 를 만들지 않는다 (입출고 통계와 섞이지 않게).
--   - activity_logs 에는 명시적 'adjust' action 으로 기록 (감사 흔적).
--     (기본 log_activity 트리거는 quantity 단독 변경을 스킵하므로, 여기서
--      직접 INSERT 한다.)
--   - 음수 금지. p_new_quantity 는 절대값 세팅 (delta 아님).
--   - p_reason 필수 — 사유 없이 보정 금지 (실수 방지 + 감사).

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id   uuid,
  p_new_quantity integer,
  p_reason       text,
  p_user_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_quantity integer;
  v_low_stock    boolean := false;
  v_min_quantity integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'REASON_REQUIRED';
  END IF;

  -- Lock product row
  SELECT quantity, min_quantity
    INTO v_old_quantity, v_min_quantity
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  -- Update quantity
  UPDATE public.products
     SET quantity   = p_new_quantity,
         updated_at = now()
   WHERE id = p_product_id;

  -- Explicit audit log (trigger skips quantity-only changes)
  INSERT INTO public.activity_logs (
    user_id, action, table_name, record_id, details
  )
  VALUES (
    p_user_id,
    'adjust',
    'products',
    p_product_id,
    jsonb_build_object(
      'before_quantity', v_old_quantity,
      'after_quantity',  p_new_quantity,
      'delta',           p_new_quantity - v_old_quantity,
      'reason',          trim(p_reason)
    )
  );

  IF p_new_quantity <= v_min_quantity THEN
    v_low_stock := true;
  END IF;

  RETURN jsonb_build_object(
    'product_id',     p_product_id,
    'before_quantity', v_old_quantity,
    'after_quantity',  p_new_quantity,
    'low_stock',       v_low_stock
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer, text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer, text, uuid) TO authenticated;

COMMENT ON FUNCTION public.adjust_product_stock IS
  '관리자 전용 재고 직접 보정. 입출고 이력과 분리. activity_logs 에 ''adjust'' 로 기록.';
