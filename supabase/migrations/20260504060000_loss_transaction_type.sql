-- 분실(loss) 트랜잭션 타입 추가.
--
-- 정의:
--   - type='loss' 는 출고(out)와 분리된 별개 손실 이벤트.
--   - products.quantity 감소시키되 (out 처럼), site_id 는 옵셔널 (분실은
--     어디로 갔는지 모름이 본질).
--   - reports/views 에서 '현장 출고량' vs '분실 손실' 분리 가능하도록
--     monthly_transaction_summary, top_products_by_outgoing, outgoing_by_*
--     기존 view 들은 type='out' 만 집계 → 'loss' 는 자동 분리됨.
--   - activity_logs 에는 trigger 가 type 그대로 action 으로 기록 ('loss').
--     check constraint 에 'loss' 추가 필요.

-- 1. transactions.type CHECK 갱신
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('in', 'out', 'loss'));

-- 2. activity_logs.action CHECK 에 'loss' 추가
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_check;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_action_check
  CHECK (action IN ('create', 'update', 'delete', 'in', 'out', 'adjust', 'loss'));

-- 3. process_transaction RPC 갱신: 'loss' 분기 추가
--    - quantity 감소 (out 동일)
--    - site_id 검사 안 함 (옵셔널, NULL 허용)
--    - 음수 재고 방지 (out 동일)
CREATE OR REPLACE FUNCTION public.process_transaction(
  p_product_id uuid,
  p_type       text,
  p_quantity   integer,
  p_note       text,
  p_user_id    uuid,
  p_site_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_product        public.products;
  v_new_quantity   integer;
  v_low_stock      boolean := false;
  v_transaction_id uuid;
BEGIN
  -- Validate inputs
  IF p_type NOT IN ('in', 'out', 'loss') THEN
    RAISE EXCEPTION 'INVALID_TYPE';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;
  -- Site is required for outgoing transactions only (loss/in 은 옵셔널)
  IF p_type = 'out' AND p_site_id IS NULL THEN
    RAISE EXCEPTION 'SITE_REQUIRED';
  END IF;
  -- If a site is provided, it must exist and be active
  IF p_site_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sites WHERE id = p_site_id AND active = true
    ) THEN
      RAISE EXCEPTION 'SITE_NOT_FOUND_OR_INACTIVE';
    END IF;
  END IF;

  -- Lock product row to prevent concurrent modification
  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  -- Compute new quantity, reject negative stock
  IF p_type = 'in' THEN
    v_new_quantity := v_product.quantity + p_quantity;
  ELSE
    -- out 또는 loss: 둘 다 quantity 감소
    v_new_quantity := v_product.quantity - p_quantity;
    IF v_new_quantity < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;
  END IF;

  UPDATE public.products
     SET quantity   = v_new_quantity,
         updated_at = now()
   WHERE id = p_product_id;

  INSERT INTO public.transactions (product_id, type, quantity, note, created_by, site_id)
  VALUES (p_product_id, p_type, p_quantity, p_note, p_user_id, p_site_id)
  RETURNING id INTO v_transaction_id;

  IF v_new_quantity <= v_product.min_quantity THEN
    v_low_stock := true;
  END IF;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'product_id',     p_product_id,
    'new_quantity',   v_new_quantity,
    'low_stock',      v_low_stock
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_transaction(uuid, text, integer, text, uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.process_transaction(uuid, text, integer, text, uuid, uuid) TO authenticated;
