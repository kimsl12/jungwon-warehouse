-- =============================================================================
-- 분실(loss) 트랜잭션도 취소 가능하게.
--
-- 기존: undo_transaction / admin_cancel_transaction 의 역방향 CASE 가
-- in/out 만 처리해서 loss 는 INVALID_TX_TYPE 예외 → 분실을 잘못 입력하면
-- 정정 수단이 없었다 (반대 방향 수동 입력만 가능).
--
-- 수정: loss 의 역방향은 'in' (분실 정정 = 재고 복구). 역방향 행은
-- related_tx_id 가 설정되므로 입고 통계에는 잡히지 않는다
-- (20260611000000 에서 집계 필터 적용됨).
-- =============================================================================

-- 1. undo_transaction (본인, 20분 이내)
CREATE OR REPLACE FUNCTION public.undo_transaction(
  p_tx_id   uuid,
  p_reason  text DEFAULT NULL
)
RETURNS uuid   -- 생성된 역방향 트랜잭션 ID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tx         public.transactions;
  v_now        timestamptz := now();
  v_reverse_type text;
  v_product    public.products;
  v_new_tx_id  uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  -- 원본 lock
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_tx_id FOR UPDATE;
  IF v_tx.id IS NULL THEN
    RAISE EXCEPTION 'TX_NOT_FOUND';
  END IF;

  -- 이미 취소된 것 재취소 금지
  IF v_tx.canceled_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_CANCELED';
  END IF;

  -- 20분 제한
  IF v_tx.created_at < v_now - interval '20 minutes' THEN
    RAISE EXCEPTION 'UNDO_WINDOW_EXPIRED';
  END IF;

  -- 본인 건만 취소 가능 (admin도 본인 것만 취소 — 단순화)
  IF v_tx.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_OWNER';
  END IF;

  -- 자재 신청/발주서 연계 건은 차단 (note prefix 기반 휴리스틱)
  IF v_tx.note LIKE '자재 신청 출고%' OR v_tx.note LIKE '발주 %입고%' THEN
    RAISE EXCEPTION 'LINKED_TX';
  END IF;

  -- 역방향 계산 (loss 취소 = 재고 복구 'in')
  v_reverse_type := CASE v_tx.type
    WHEN 'in'   THEN 'out'
    WHEN 'out'  THEN 'in'
    WHEN 'loss' THEN 'in'
    ELSE NULL
  END;
  IF v_reverse_type IS NULL THEN
    RAISE EXCEPTION 'INVALID_TX_TYPE';
  END IF;

  -- 역방향이 'out' 인 경우 재고 음수 방지 체크
  SELECT * INTO v_product FROM public.products WHERE id = v_tx.product_id FOR UPDATE;
  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;
  IF v_reverse_type = 'out' AND v_product.quantity < v_tx.quantity THEN
    -- 입고 취소인데 이미 출고된 뒤라 재고가 부족한 상황
    RAISE EXCEPTION 'INSUFFICIENT_STOCK_FOR_UNDO';
  END IF;

  -- 재고 업데이트
  IF v_reverse_type = 'in' THEN
    UPDATE public.products
       SET quantity = quantity + v_tx.quantity, updated_at = now()
     WHERE id = v_tx.product_id;
  ELSE
    UPDATE public.products
       SET quantity = quantity - v_tx.quantity, updated_at = now()
     WHERE id = v_tx.product_id;
  END IF;

  -- 역방향 트랜잭션 insert
  INSERT INTO public.transactions (
    product_id, type, quantity, note, created_by, site_id, related_tx_id
  ) VALUES (
    v_tx.product_id,
    v_reverse_type,
    v_tx.quantity,
    '[취소] ' || coalesce(v_tx.note, ''),
    auth.uid(),
    v_tx.site_id,
    v_tx.id
  )
  RETURNING id INTO v_new_tx_id;

  -- 원본에 취소 표시 + related_tx_id 로 역방향 연결
  UPDATE public.transactions
     SET canceled_at     = v_now,
         canceled_by     = auth.uid(),
         canceled_reason = p_reason,
         related_tx_id   = v_new_tx_id
   WHERE id = v_tx.id;

  RETURN v_new_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_transaction(uuid, text) TO authenticated;

-- 2. admin_cancel_transaction (admin, 시간 제한 없음)
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

  -- loss 취소 = 재고 복구 'in'
  v_reverse_type := CASE v_tx.type
    WHEN 'in'   THEN 'out'
    WHEN 'out'  THEN 'in'
    WHEN 'loss' THEN 'in'
    ELSE NULL
  END;
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
