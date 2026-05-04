-- transactions 에 vendor_id 컬럼 추가 (옵셔널 FK).
-- 목적: 입고가 어느 거래처에서 왔는지 직접 조회 가능 → /transactions
-- 페이지에 거래처 필터 추가, 거래처별 입고 통계 단순화.
--
-- 정책:
--   - PO 기반 입고 (receive_purchase_order_items RPC) → vendor_id 자동 채움
--   - 간이 입고 (process_transaction 직접 호출) → vendor_id NULL (옵셔널)
--   - 출고 / 분실 → vendor_id NULL (의미 없음, 막지는 않음)
--   - 거래처 삭제 시 SET NULL (이력 보존)

ALTER TABLE public.transactions
  ADD COLUMN vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

CREATE INDEX transactions_vendor_id_idx ON public.transactions (vendor_id);

COMMENT ON COLUMN public.transactions.vendor_id IS
  '입고 transaction 의 출처 거래처. PO 입고 시 자동으로 PO 의 vendor_id 가 들어감. NULL=거래처 미지정 또는 출고/분실.';

-- ─── receive_purchase_order_items 갱신 ────────────────────────────────────
-- process_transaction 호출 후, 방금 INSERT 된 transactions row 에
-- vendor_id 를 채운다. process_transaction 시그니처 변경 없이 사후 보정.

CREATE OR REPLACE FUNCTION public.receive_purchase_order_items(
  p_po_id    uuid,
  p_receipts jsonb,
  p_user_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_receipt         jsonb;
  v_item_id         uuid;
  v_qty             integer;
  v_item            public.purchase_order_items;
  v_total_items     integer;
  v_fulfilled       integer;
  v_new_po_status   text;
  v_vendor_id       uuid;
  v_tx_result       jsonb;
  v_tx_id           uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF (SELECT status FROM public.purchase_orders WHERE id = p_po_id)
     NOT IN ('sent', 'receiving') THEN
    RAISE EXCEPTION 'PO_NOT_RECEIVABLE';
  END IF;

  SELECT vendor_id INTO v_vendor_id FROM public.purchase_orders WHERE id = p_po_id;

  FOR v_receipt IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    v_item_id := (v_receipt->>'item_id')::uuid;
    v_qty     := (v_receipt->>'received_quantity')::integer;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_item
      FROM public.purchase_order_items
     WHERE id = v_item_id AND purchase_order_id = p_po_id
     FOR UPDATE;

    IF v_item.id IS NULL THEN
      RAISE EXCEPTION 'ITEM_NOT_FOUND';
    END IF;

    IF v_item.received_quantity + v_qty > v_item.ordered_quantity THEN
      RAISE EXCEPTION 'OVER_RECEIPT';
    END IF;

    -- 재고 증가 + transactions 기록
    v_tx_result := public.process_transaction(
      v_item.product_id,
      'in',
      v_qty,
      '발주 ' || (SELECT po_number FROM public.purchase_orders WHERE id = p_po_id)
        || ' 입고',
      p_user_id,
      NULL
    );

    -- 방금 만든 transaction 의 vendor_id 채우기
    v_tx_id := (v_tx_result->>'transaction_id')::uuid;
    UPDATE public.transactions
       SET vendor_id = v_vendor_id
     WHERE id = v_tx_id;

    UPDATE public.purchase_order_items
       SET received_quantity = received_quantity + v_qty
     WHERE id = v_item_id;
  END LOOP;

  SELECT count(*),
         count(*) FILTER (WHERE received_quantity >= ordered_quantity)
    INTO v_total_items, v_fulfilled
    FROM public.purchase_order_items
   WHERE purchase_order_id = p_po_id;

  IF v_fulfilled = v_total_items THEN
    v_new_po_status := 'received';
  ELSIF v_fulfilled > 0 OR EXISTS (
    SELECT 1 FROM public.purchase_order_items
     WHERE purchase_order_id = p_po_id AND received_quantity > 0
  ) THEN
    v_new_po_status := 'receiving';
  ELSE
    v_new_po_status := 'sent';
  END IF;

  UPDATE public.purchase_orders
     SET status       = v_new_po_status,
         completed_at = CASE WHEN v_new_po_status = 'received' THEN now() ELSE completed_at END
   WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'po_id',   p_po_id,
    'status',  v_new_po_status,
    'fulfilled_items', v_fulfilled,
    'total_items',     v_total_items
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.receive_purchase_order_items(uuid, jsonb, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.receive_purchase_order_items(uuid, jsonb, uuid) TO authenticated;
