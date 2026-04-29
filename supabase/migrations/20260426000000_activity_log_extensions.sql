-- =============================================================================
-- Activity log 확장 — request_templates CRUD 로깅
-- 관리자 다수 환경에서 누가 공용 템플릿을 만들고 지웠는지 추적용
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

  -- ↓↓ 신규: request_templates ↓↓
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

-- 트리거 부착 (DROP IF EXISTS 후 재생성 — 멱등성 확보)
DROP TRIGGER IF EXISTS request_templates_activity_log ON public.request_templates;
CREATE TRIGGER request_templates_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.request_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
