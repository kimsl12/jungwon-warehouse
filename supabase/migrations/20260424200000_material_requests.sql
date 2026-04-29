-- =============================================================================
-- 자재 신청 (material_requests) + 신청 아이템 (material_request_items)
-- + 프로필 현장 배정 (profile_sites)
--
-- 플로우:
--   submitted (현장 담당자 제출)
--     → approved (관리자 승인, PDF 발급 시점)
--       → fulfilled (전량 출고 완료) 또는 approved 유지 (부분 출고 중)
--     → rejected (관리자 거절)
--   언제든 canceled 가능 (본인/관리자)
--
-- 부분 출고: items.fulfilled_quantity 를 누적. requested_quantity 도달 시
-- 해당 item 완료. 모든 item 완료되면 request status = 'fulfilled'.
--
-- 출고 처리 RPC(fulfill_material_request_items)는 각 수령에 대해
-- process_transaction(type='out', site_id) 을 호출해 재고 차감 + 출고 이력 +
-- activity_log 를 통합 처리한다.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. profile_sites — 현장 담당자(user)가 접근 가능한 현장 배정
-- -----------------------------------------------------------------------------
CREATE TABLE public.profile_sites (
  profile_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_id      uuid        NOT NULL REFERENCES public.sites(id)    ON DELETE CASCADE,
  assigned_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, site_id)
);

COMMENT ON TABLE public.profile_sites IS '현장 담당자(user role)에게 배정된 현장 목록';

CREATE INDEX profile_sites_profile_idx ON public.profile_sites (profile_id);
CREATE INDEX profile_sites_site_idx    ON public.profile_sites (site_id);


-- -----------------------------------------------------------------------------
-- 2. material_requests — 신청 헤더
-- -----------------------------------------------------------------------------
CREATE TABLE public.material_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid        NOT NULL REFERENCES public.sites(id)     ON DELETE RESTRICT,
  created_by    uuid        NOT NULL REFERENCES auth.users(id)       ON DELETE RESTRICT,
  status        text        NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('submitted', 'approved', 'fulfilled', 'rejected', 'canceled')),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  approved_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  fulfilled_at  timestamptz,
  rejected_at   timestamptz,
  reject_reason text,
  canceled_at   timestamptz,
  canceled_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.material_requests IS '현장 담당자 자재 신청 헤더';

CREATE INDEX material_requests_site_idx      ON public.material_requests (site_id);
CREATE INDEX material_requests_created_by_idx ON public.material_requests (created_by);
CREATE INDEX material_requests_status_idx    ON public.material_requests (status);
CREATE INDEX material_requests_created_at_idx ON public.material_requests (created_at DESC);

CREATE TRIGGER material_requests_set_updated_at
  BEFORE UPDATE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. material_request_items — 신청 라인 아이템
-- -----------------------------------------------------------------------------
CREATE TABLE public.material_request_items (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            uuid    NOT NULL REFERENCES public.material_requests(id) ON DELETE CASCADE,
  product_id            uuid    NOT NULL REFERENCES public.products(id)          ON DELETE RESTRICT,
  -- 스냅샷 (신청 시점 값 보존)
  product_name          text    NOT NULL,
  product_variant       text,
  unit                  text,
  requested_quantity    integer NOT NULL CHECK (requested_quantity > 0),
  fulfilled_quantity    integer NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
  note                  text,
  sort_order            integer NOT NULL DEFAULT 0,
  CHECK (fulfilled_quantity <= requested_quantity)
);

COMMENT ON TABLE public.material_request_items IS '자재 신청 라인 아이템';

CREATE INDEX mri_request_idx ON public.material_request_items (request_id);
CREATE INDEX mri_product_idx ON public.material_request_items (product_id);


-- -----------------------------------------------------------------------------
-- 4. 현장 담당자가 접근 가능한 현장인지 체크 helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_site_assigned(p_site_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_sites
    WHERE profile_id = auth.uid() AND site_id = p_site_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_site_assigned(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 5. create_material_request — 현장 담당자(user) 또는 admin 호출 가능
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_material_request(
  p_site_id   uuid,
  p_items     jsonb,  -- [{product_id, requested_quantity, note}]
  p_note      text,
  p_user_id   uuid
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
  -- 인증 필수
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  -- admin이 아니라면 배정된 현장만 허용
  IF NOT public.is_admin() AND NOT public.is_site_assigned(p_site_id) THEN
    RAISE EXCEPTION 'SITE_NOT_ASSIGNED';
  END IF;

  IF p_site_id IS NULL THEN
    RAISE EXCEPTION 'SITE_REQUIRED';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ITEMS_REQUIRED';
  END IF;

  INSERT INTO public.material_requests (site_id, created_by, status, note)
  VALUES (p_site_id, p_user_id, 'submitted', p_note)
  RETURNING id INTO v_request_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_idx := v_idx + 1;
    v_qty := (v_item->>'requested_quantity')::integer;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    -- 제품 스냅샷 조회
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

GRANT EXECUTE ON FUNCTION public.create_material_request(uuid, jsonb, text, uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 6. approve_material_request — admin 전용
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_material_request(p_request_id uuid)
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

  SELECT status INTO v_current FROM public.material_requests WHERE id = p_request_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
  IF v_current <> 'submitted' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  UPDATE public.material_requests
     SET status      = 'approved',
         approved_at = now(),
         approved_by = auth.uid()
   WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_material_request(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 7. reject_material_request — admin 전용
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_material_request(
  p_request_id uuid,
  p_reason     text
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

  SELECT status INTO v_current FROM public.material_requests WHERE id = p_request_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
  IF v_current NOT IN ('submitted', 'approved') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  UPDATE public.material_requests
     SET status        = 'rejected',
         rejected_at   = now(),
         reject_reason = p_reason
   WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_material_request(uuid, text) TO authenticated;


-- -----------------------------------------------------------------------------
-- 8. cancel_material_request — 본인(submitted 상태만) 또는 admin
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_material_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current  text;
  v_owner    uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT status, created_by INTO v_current, v_owner
    FROM public.material_requests WHERE id = p_request_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  -- admin은 언제든, 본인은 submitted 상태에서만
  IF NOT public.is_admin() THEN
    IF v_owner <> auth.uid() OR v_current <> 'submitted' THEN
      RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;
  END IF;

  IF v_current IN ('fulfilled', 'canceled') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  UPDATE public.material_requests
     SET status      = 'canceled',
         canceled_at = now(),
         canceled_by = auth.uid()
   WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_material_request(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 9. fulfill_material_request_items — admin 전용, 부분 출고 처리
--    p_fulfillments: [{ item_id, quantity }]
--    각 출고 라인마다 process_transaction(type='out', site_id) 호출하여
--    재고 차감 + transactions 이력 + activity_log 기록. 해당 item의
--    fulfilled_quantity 누적. 모든 item의 fulfilled_quantity 가 requested_quantity 에
--    도달하면 request 상태를 'fulfilled' 로 변경.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fulfill_material_request_items(
  p_request_id   uuid,
  p_fulfillments jsonb,
  p_user_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_fulfillment     jsonb;
  v_item_id         uuid;
  v_qty             integer;
  v_item            public.material_request_items;
  v_request         public.material_requests;
  v_total_items     integer;
  v_fulfilled_items integer;
  v_new_status      text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT * INTO v_request FROM public.material_requests WHERE id = p_request_id FOR UPDATE;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
  IF v_request.status NOT IN ('approved') THEN
    RAISE EXCEPTION 'REQUEST_NOT_APPROVED';
  END IF;

  FOR v_fulfillment IN SELECT * FROM jsonb_array_elements(p_fulfillments)
  LOOP
    v_item_id := (v_fulfillment->>'item_id')::uuid;
    v_qty     := (v_fulfillment->>'quantity')::integer;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;  -- 0 이하면 스킵
    END IF;

    -- 아이템 락
    SELECT * INTO v_item
      FROM public.material_request_items
     WHERE id = v_item_id AND request_id = p_request_id
     FOR UPDATE;

    IF v_item.id IS NULL THEN
      RAISE EXCEPTION 'ITEM_NOT_FOUND';
    END IF;

    IF v_item.fulfilled_quantity + v_qty > v_item.requested_quantity THEN
      RAISE EXCEPTION 'OVER_FULFILLMENT';
    END IF;

    -- 재고 차감 + transactions 기록 (process_transaction 재사용, site_id 전달)
    PERFORM public.process_transaction(
      v_item.product_id,
      'out',
      v_qty,
      '자재 신청 출고 (신청 #' || substr(p_request_id::text, 1, 8) || ')',
      p_user_id,
      v_request.site_id
    );

    -- 누적
    UPDATE public.material_request_items
       SET fulfilled_quantity = fulfilled_quantity + v_qty
     WHERE id = v_item_id;
  END LOOP;

  -- 전체 완료 여부 판단
  SELECT count(*),
         count(*) FILTER (WHERE fulfilled_quantity >= requested_quantity)
    INTO v_total_items, v_fulfilled_items
    FROM public.material_request_items
   WHERE request_id = p_request_id;

  IF v_fulfilled_items = v_total_items THEN
    v_new_status := 'fulfilled';
    UPDATE public.material_requests
       SET status = v_new_status, fulfilled_at = now()
     WHERE id = p_request_id;
  ELSE
    v_new_status := v_request.status;  -- 유지 (approved)
  END IF;

  RETURN jsonb_build_object(
    'request_id',      p_request_id,
    'status',          v_new_status,
    'fulfilled_items', v_fulfilled_items,
    'total_items',     v_total_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fulfill_material_request_items(uuid, jsonb, uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 10. log_activity 트리거 확장 — material_requests 처리
--     상태 전이만 details에 남기고 items는 따로 기록하지 않음 (로그 비대화 방지).
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

  ELSIF tg_table_name = 'material_requests' THEN
    IF tg_op = 'INSERT' THEN
      v_action := 'create';
      v_record_id := new.id;
      v_details := jsonb_build_object('site_id', new.site_id, 'status', new.status);
    ELSIF tg_op = 'UPDATE' THEN
      IF old.status = new.status THEN
        RETURN new;  -- 상태 변화 없으면 로그 생략
      END IF;
      v_action := 'update';
      v_record_id := new.id;
      v_details := jsonb_build_object('before_status', old.status, 'after_status', new.status);
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

CREATE TRIGGER material_requests_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();


-- -----------------------------------------------------------------------------
-- 11. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.profile_sites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_request_items  ENABLE ROW LEVEL SECURITY;

-- profile_sites: user는 자기 행만 SELECT / admin은 전체 관리
CREATE POLICY "ps_self_select" ON public.profile_sites
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "ps_admin_all" ON public.profile_sites
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- material_requests: user는 자기 것만 / admin 전체
CREATE POLICY "mr_self_select" ON public.material_requests
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "mr_self_insert" ON public.material_requests
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "mr_admin_all" ON public.material_requests
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- material_request_items: 부모 request 권한 승계
CREATE POLICY "mri_self_select" ON public.material_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.material_requests r
      WHERE r.id = request_id
        AND (r.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "mri_admin_all" ON public.material_request_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
