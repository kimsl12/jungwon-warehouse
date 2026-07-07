-- =============================================================================
-- 1) 자재 신청 취소 + 출고분 재고 회수 RPC
-- 2) 활동 로그 공백 보강 — sites 트리거 부착, profiles(role 변경) 로깅
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. cancel_material_request_with_restock
--
-- 기존 cancel_material_request 는 상태만 바꿔서, 부분 출고된 신청을 취소하면
-- 이미 나간 자재가 조용히 남았다 (연계 출고 건은 admin 취소도 LINKED_TX 차단).
-- admin 전용으로 취소 + (선택) 해당 신청의 출고 건 전체 회수를 제공한다.
--   - 회수는 admin_cancel_transaction 과 동일 패턴: 원본 canceled_at 마킹 +
--     related_tx_id 역방향 'in' insert → 재고 복구 + 집계 오염 없음
--   - 출고 건 식별: fulfill 이 기록하는 note '자재 신청 출고 (신청 #xxxxxxxx)'
--   - 전량 출고(fulfilled) 상태도 취소+회수 가능 (기존엔 취소 불가로 막혀 있었음)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_material_request_with_restock(
  p_request_id uuid,
  p_restock    boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_request         public.material_requests;
  v_tx              public.transactions;
  v_new_tx_id       uuid;
  v_note_tag        text;
  v_restocked_count integer := 0;
  v_restocked_qty   integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT * INTO v_request
    FROM public.material_requests WHERE id = p_request_id FOR UPDATE;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
  IF v_request.status IN ('canceled', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  IF p_restock THEN
    v_note_tag := '자재 신청 출고 (신청 #' || substr(p_request_id::text, 1, 8) || ')';
    FOR v_tx IN
      SELECT * FROM public.transactions
      WHERE type = 'out'
        AND note = v_note_tag
        AND canceled_at IS NULL
        AND related_tx_id IS NULL
      FOR UPDATE
    LOOP
      -- 재고 복구 (제품 행 잠금 후 증가 — 역방향 'in' 이라 음수 위험 없음)
      PERFORM 1 FROM public.products WHERE id = v_tx.product_id FOR UPDATE;
      UPDATE public.products
         SET quantity = quantity + v_tx.quantity, updated_at = now()
       WHERE id = v_tx.product_id;

      INSERT INTO public.transactions (
        product_id, type, quantity, note, created_by, site_id, related_tx_id
      ) VALUES (
        v_tx.product_id,
        'in',
        v_tx.quantity,
        '[신청 취소 회수] ' || coalesce(v_tx.note, ''),
        auth.uid(),
        v_tx.site_id,
        v_tx.id
      )
      RETURNING id INTO v_new_tx_id;

      UPDATE public.transactions
         SET canceled_at     = now(),
             canceled_by     = auth.uid(),
             canceled_reason = '신청 취소에 따른 재고 회수',
             related_tx_id   = v_new_tx_id
       WHERE id = v_tx.id;

      v_restocked_count := v_restocked_count + 1;
      v_restocked_qty   := v_restocked_qty + v_tx.quantity;
    END LOOP;
  END IF;

  UPDATE public.material_requests
     SET status      = 'canceled',
         canceled_at = now(),
         canceled_by = auth.uid()
   WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'restocked_count',    v_restocked_count,
    'restocked_quantity', v_restocked_qty
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_material_request_with_restock(uuid, boolean) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2-a. sites 트리거 부착 — log_activity() 에 분기는 있었으나 트리거가 없었음
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS sites_activity_log ON public.sites;
CREATE TRIGGER sites_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- -----------------------------------------------------------------------------
-- 2-b. profiles 로깅 — role/이름 변경 추적 (UPDATE 만; 가입 INSERT 는 노이즈)
--      log_activity() 재정의: 기존 분기 유지 + profiles 분기 추가
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
      v_details := jsonb_build_object('site_id', new.site_id, 'status', new.status, 'is_urgent', new.is_urgent);
    ELSIF tg_op = 'UPDATE' THEN
      IF old.status = new.status THEN
        RETURN new;
      END IF;
      v_action := 'update';
      v_record_id := new.id;
      v_details := jsonb_build_object('before_status', old.status, 'after_status', new.status);
    ELSIF tg_op = 'DELETE' THEN
      v_action := 'delete';
      v_record_id := old.id;
      v_details := to_jsonb(old);
    END IF;

  ELSIF tg_table_name = 'request_templates' THEN
    IF tg_op = 'INSERT' THEN
      v_action := 'create';
      v_record_id := new.id;
      v_details := jsonb_build_object(
        'name',      new.name,
        'is_public', new.is_public,
        'item_count', jsonb_array_length(new.items)
      );
    ELSIF tg_op = 'UPDATE' THEN
      v_action := 'update';
      v_record_id := new.id;
      v_details := jsonb_build_object(
        'name',           new.name,
        'before_name',    old.name,
        'before_is_public', old.is_public,
        'after_is_public',  new.is_public
      );
    ELSIF tg_op = 'DELETE' THEN
      v_action := 'delete';
      v_record_id := old.id;
      v_details := jsonb_build_object(
        'name',      old.name,
        'is_public', old.is_public,
        'item_count', jsonb_array_length(old.items)
      );
    END IF;

  -- ↓↓ 신규: profiles (role/이름 변경 추적) ↓↓
  ELSIF tg_table_name = 'profiles' AND tg_op = 'UPDATE' THEN
    IF old.role IS NOT DISTINCT FROM new.role
       AND old.name IS NOT DISTINCT FROM new.name THEN
      RETURN new;
    END IF;
    v_action := 'update';
    v_record_id := new.id;
    v_details := jsonb_build_object(
      'before_role', old.role,
      'after_role',  new.role,
      'before_name', old.name,
      'after_name',  new.name
    );
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

DROP TRIGGER IF EXISTS profiles_activity_log ON public.profiles;
CREATE TRIGGER profiles_activity_log
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
