-- =============================================================================
-- 발주서(purchase_orders) + 발주 라인 아이템(purchase_order_items)
--
-- 플로우:
--   draft(작성중) → sent(발송완료) → receiving(부분수령중) → received(완료)
--   중간 취소 가능: canceled
--
-- 부분 수령 허용: 각 아이템의 received_quantity 를 누적. ordered_quantity에
-- 도달하면 그 아이템은 완료. 모든 아이템이 완료되면 PO 상태가 received.
--
-- 수령 처리 RPC(receive_purchase_order_items)는 각 수령에 대해
-- process_transaction(type='in') 을 호출해 재고 증가 + 입고 이력 기록 +
-- activity_log 를 통합 처리한다.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. purchase_orders
-- -----------------------------------------------------------------------------
CREATE TABLE public.purchase_orders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number       text        NOT NULL UNIQUE,
  vendor_id       uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  status          text        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'receiving', 'received', 'canceled')),
  order_date      date        NOT NULL DEFAULT (now()::date),
  due_date        date,
  -- 하단 박스 필드들 (드롭다운으로 선택되거나 빈 문자열)
  payment_terms   text,
  delivery_terms  text,
  inspection_terms text,
  ship_to         text,
  ship_to_contact text,
  note            text,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  completed_at    timestamptz
);

COMMENT ON TABLE public.purchase_orders IS '발주서 헤더';

CREATE INDEX purchase_orders_vendor_idx  ON public.purchase_orders (vendor_id);
CREATE INDEX purchase_orders_status_idx  ON public.purchase_orders (status);
CREATE INDEX purchase_orders_created_idx ON public.purchase_orders (created_at DESC);

CREATE TRIGGER purchase_orders_set_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. purchase_order_items
-- -----------------------------------------------------------------------------
CREATE TABLE public.purchase_order_items (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   uuid    NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id          uuid    NOT NULL REFERENCES public.products(id)        ON DELETE RESTRICT,
  -- 발주 스냅샷 (이후 product.name/variant 가 바뀌어도 발주서는 그 시점 값 유지)
  product_name        text    NOT NULL,
  product_variant     text,
  spec                text,      -- 규격 (발주서 양식의 "규격" 컬럼. 선택)
  unit                text,      -- 단위 스냅샷
  ordered_quantity    integer NOT NULL CHECK (ordered_quantity > 0),
  received_quantity   integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit_price          integer NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  note                text,
  sort_order          integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.purchase_order_items IS '발주서 라인 아이템';

CREATE INDEX poi_po_idx      ON public.purchase_order_items (purchase_order_id);
CREATE INDEX poi_product_idx ON public.purchase_order_items (product_id);


-- -----------------------------------------------------------------------------
-- 3. PO 번호 생성 — 당일 기준 일련번호 (PO-YYYYMMDD-###)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text := 'PO-' || to_char((now() AT TIME ZONE 'Asia/Seoul')::date, 'YYYYMMDD');
  v_seq    integer;
  v_number text;
BEGIN
  -- 오늘 날짜 prefix 를 갖는 기존 번호 중 최대값 +1
  SELECT coalesce(max((regexp_match(po_number, '-(\d+)$'))[1]::integer), 0) + 1
    INTO v_seq
    FROM public.purchase_orders
   WHERE po_number LIKE v_prefix || '-%';

  v_number := v_prefix || '-' || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. 발주서 생성 RPC: 헤더 + 아이템을 한 트랜잭션으로 INSERT
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_purchase_order(
  p_vendor_id        uuid,
  p_order_date       date,
  p_due_date         date,
  p_payment_terms    text,
  p_delivery_terms   text,
  p_inspection_terms text,
  p_ship_to          text,
  p_ship_to_contact  text,
  p_note             text,
  p_items            jsonb,  -- [{product_id, product_name, product_variant, spec, unit, ordered_quantity, unit_price, note}]
  p_user_id          uuid,
  p_status           text DEFAULT 'draft'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_po_id    uuid;
  v_number   text;
  v_item     jsonb;
  v_idx      integer := 0;
BEGIN
  -- admin만 발주서 생성 가능
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_status NOT IN ('draft', 'sent') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  IF p_vendor_id IS NULL THEN
    RAISE EXCEPTION 'VENDOR_REQUIRED';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ITEMS_REQUIRED';
  END IF;

  v_number := public.generate_po_number();

  INSERT INTO public.purchase_orders (
    po_number, vendor_id, status, order_date, due_date,
    payment_terms, delivery_terms, inspection_terms,
    ship_to, ship_to_contact, note, created_by, sent_at
  ) VALUES (
    v_number, p_vendor_id, p_status, p_order_date, p_due_date,
    p_payment_terms, p_delivery_terms, p_inspection_terms,
    p_ship_to, p_ship_to_contact, p_note, p_user_id,
    CASE WHEN p_status = 'sent' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_po_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.purchase_order_items (
      purchase_order_id, product_id, product_name, product_variant,
      spec, unit, ordered_quantity, unit_price, note, sort_order
    ) VALUES (
      v_po_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_item->>'product_variant',
      v_item->>'spec',
      v_item->>'unit',
      (v_item->>'ordered_quantity')::integer,
      coalesce((v_item->>'unit_price')::integer, 0),
      v_item->>'note',
      v_idx
    );
  END LOOP;

  RETURN v_po_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_purchase_order(
  uuid, date, date, text, text, text, text, text, text, jsonb, uuid, text
) TO authenticated;


-- -----------------------------------------------------------------------------
-- 5. 발주서 상태 변경 RPC (작성 → 발송, 취소)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_purchase_order_status(
  p_po_id  uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT status INTO v_current FROM public.purchase_orders WHERE id = p_po_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'PO_NOT_FOUND';
  END IF;

  -- 허용 전이
  IF  (v_current = 'draft'     AND p_status IN ('sent', 'canceled'))
   OR (v_current = 'sent'      AND p_status IN ('canceled'))
  THEN
    UPDATE public.purchase_orders
       SET status  = p_status,
           sent_at = CASE WHEN p_status = 'sent'     THEN now() ELSE sent_at END
     WHERE id = p_po_id;
  ELSE
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_purchase_order_status(uuid, text) TO authenticated;


-- -----------------------------------------------------------------------------
-- 6. 입고(수령) 처리 RPC — 부분 수령 허용
--    p_receipts: [{ item_id, received_quantity }]
--    각 수령 라인마다 process_transaction(type='in') 호출하여 재고 증가 +
--    transactions 이력 기록. 해당 아이템의 received_quantity 누적.
--    모든 아이템이 ordered_quantity에 도달하면 PO 상태를 'received' 로 변경,
--    일부만 받았으면 'receiving' 으로 표기.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase_order_items(
  p_po_id    uuid,
  p_receipts jsonb,   -- [{ item_id: uuid, received_quantity: int }]
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF (SELECT status FROM public.purchase_orders WHERE id = p_po_id)
     NOT IN ('sent', 'receiving') THEN
    RAISE EXCEPTION 'PO_NOT_RECEIVABLE';
  END IF;

  FOR v_receipt IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    v_item_id := (v_receipt->>'item_id')::uuid;
    v_qty     := (v_receipt->>'received_quantity')::integer;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;  -- 0 이하면 스킵
    END IF;

    -- 아이템 락 + 유효성
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

    -- 재고 증가 + transactions 기록 (기존 process_transaction 재사용)
    PERFORM public.process_transaction(
      v_item.product_id,
      'in',
      v_qty,
      '발주 ' || (SELECT po_number FROM public.purchase_orders WHERE id = p_po_id)
        || ' 입고',
      p_user_id,
      NULL   -- site_id: 입고는 현장 불요
    );

    -- 수령량 누적
    UPDATE public.purchase_order_items
       SET received_quantity = received_quantity + v_qty
     WHERE id = v_item_id;
  END LOOP;

  -- PO 전체 상태 재계산
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

GRANT EXECUTE ON FUNCTION public.receive_purchase_order_items(uuid, jsonb, uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 7. activity_log 트리거 확장 (purchase_orders 추가)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_action    text;
  v_record_id uuid;
  v_details   jsonb;
BEGIN
  IF tg_table_name = 'transactions' AND tg_op = 'INSERT' THEN
    v_action := new.type;
    v_record_id := new.id;
    v_details := jsonb_build_object(
      'product_id', new.product_id,
      'quantity',   new.quantity,
      'note',       new.note,
      'site_id',    new.site_id
    );

  ELSIF tg_table_name = 'products' THEN
    IF tg_op = 'INSERT' THEN
      v_action := 'create';
      v_record_id := new.id;
      v_details := to_jsonb(new);
    ELSIF tg_op = 'UPDATE' THEN
      IF (to_jsonb(new) - 'quantity' - 'updated_at')
       = (to_jsonb(old) - 'quantity' - 'updated_at') THEN
        RETURN new;
      END IF;
      v_action := 'update';
      v_record_id := new.id;
      v_details := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
    ELSIF tg_op = 'DELETE' THEN
      v_action := 'delete';
      v_record_id := old.id;
      v_details := to_jsonb(old);
    END IF;

  ELSIF tg_table_name IN ('sites', 'vendors') THEN
    IF tg_op = 'INSERT' THEN
      v_action := 'create';
      v_record_id := new.id;
      v_details := to_jsonb(new);
    ELSIF tg_op = 'UPDATE' THEN
      v_action := 'update';
      v_record_id := new.id;
      v_details := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
    ELSIF tg_op = 'DELETE' THEN
      v_action := 'delete';
      v_record_id := old.id;
      v_details := to_jsonb(old);
    END IF;

  ELSIF tg_table_name = 'purchase_orders' THEN
    IF tg_op = 'INSERT' THEN
      v_action := 'create';
      v_record_id := new.id;
      v_details := jsonb_build_object('po_number', new.po_number, 'vendor_id', new.vendor_id, 'status', new.status);
    ELSIF tg_op = 'UPDATE' THEN
      v_action := 'update';
      v_record_id := new.id;
      v_details := jsonb_build_object(
        'po_number', new.po_number,
        'before_status', old.status,
        'after_status',  new.status
      );
    ELSIF tg_op = 'DELETE' THEN
      v_action := 'delete';
      v_record_id := old.id;
      v_details := to_jsonb(old);
    END IF;
  END IF;

  IF v_action IS NOT NULL THEN
    INSERT INTO public.activity_logs (user_id, action, table_name, record_id, details)
    VALUES (v_user_id, v_action, tg_table_name, v_record_id, v_details);
  END IF;

  IF tg_op = 'DELETE' THEN
    RETURN old;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER purchase_orders_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();


-- -----------------------------------------------------------------------------
-- 8. RLS
-- admin만 모든 작업 가능. 인증 사용자는 조회 가능 (검색 요구가 생기면 완화).
-- -----------------------------------------------------------------------------
ALTER TABLE public.purchase_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "po_select_authenticated" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "po_admin_all" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "poi_select_authenticated" ON public.purchase_order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "poi_admin_all" ON public.purchase_order_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
