-- admin 이 시간 제한 없이 입출고를 취소(삭제). 자재 신청·발주 연계 건은 차단.
-- canceled_at 마킹 + 역방향 트랜잭션 insert 로 재고 자동 복구. undo_transaction 과 동일 패턴.

CREATE OR REPLACE FUNCTION public.admin_cancel_transaction(
  p_tx_id   uuid,
  p_reason  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tx            public.transactions;
  v_now           timestamptz := now();
  v_reverse_type  text;
  v_product       public.products;
  v_new_tx_id     uuid;
  v_role          text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_tx_id FOR UPDATE;
  IF v_tx.id IS NULL THEN
    RAISE EXCEPTION 'TX_NOT_FOUND';
  END IF;

  IF v_tx.canceled_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_CANCELED';
  END IF;

  -- 자재 신청·발주 연계 건은 별도 화면에서 처리해야 흐름이 깨지지 않음.
  IF v_tx.note LIKE '자재 신청 출고%' OR v_tx.note LIKE '발주 %입고%' THEN
    RAISE EXCEPTION 'LINKED_TX';
  END IF;

  v_reverse_type := CASE v_tx.type WHEN 'in' THEN 'out' WHEN 'out' THEN 'in' ELSE NULL END;
  IF v_reverse_type IS NULL THEN
    RAISE EXCEPTION 'INVALID_TX_TYPE';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = v_tx.product_id FOR UPDATE;
  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;
  IF v_reverse_type = 'out' AND v_product.quantity < v_tx.quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK_FOR_UNDO';
  END IF;

  IF v_reverse_type = 'in' THEN
    UPDATE public.products
       SET quantity = quantity + v_tx.quantity, updated_at = now()
     WHERE id = v_tx.product_id;
  ELSE
    UPDATE public.products
       SET quantity = quantity - v_tx.quantity, updated_at = now()
     WHERE id = v_tx.product_id;
  END IF;

  INSERT INTO public.transactions (
    product_id, type, quantity, note, created_by, site_id, related_tx_id
  ) VALUES (
    v_tx.product_id,
    v_reverse_type,
    v_tx.quantity,
    '[admin 취소] ' || coalesce(v_tx.note, ''),
    auth.uid(),
    v_tx.site_id,
    v_tx.id
  )
  RETURNING id INTO v_new_tx_id;

  UPDATE public.transactions
     SET canceled_at     = v_now,
         canceled_by     = auth.uid(),
         canceled_reason = p_reason,
         related_tx_id   = v_new_tx_id
   WHERE id = v_tx.id;

  RETURN v_new_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_cancel_transaction(uuid, text) TO authenticated;
