-- =============================================================================
-- 활동 로그 노이즈 제거 — sites/vendors UPDATE 에 "변경 없음" 가드
--
-- UI 테스트 중 확인: 현장 편집 다이얼로그에서 값을 바꾸지 않고 저장해도
-- (또는 updated_at 트리거만 발화해도) "현장 · 변경 사항 없음" 로그가 쌓인다.
-- products 분기에는 이미 동일 가드가 있으므로 sites/vendors 에도 적용.
-- (20260707030000 의 log_activity() 재정의 — profiles 분기 포함 최신본 기준)
-- =============================================================================

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
      -- updated_at 외에 실제 변경이 없으면 로그 생략 (노이즈 방지)
      IF (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') THEN
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
