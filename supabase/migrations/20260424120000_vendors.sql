-- =============================================================================
-- Phase: 거래처(vendors) 관리
--
-- 정원전기가 자재를 "사오는" 외부 공급처. sites(현장)와 대칭 구조.
-- - 이미 발주 이력이 쌓인 거래처는 FK on delete restrict로 삭제 방지.
-- - 운영 종료 시엔 active=false로 비활성화(아카이브).
-- - activity_log 트리거로 모든 변경 기록.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. vendors 테이블
-- -----------------------------------------------------------------------------
CREATE TABLE public.vendors (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  ceo             text,
  contact_person  text,
  contact_phone   text,
  fax             text,
  email           text,
  address         text,
  business_number text,
  note            text,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendors IS '외부 거래처 (자재 매입처)';

CREATE UNIQUE INDEX vendors_name_unique ON public.vendors (name);
CREATE INDEX vendors_active_idx ON public.vendors (active) WHERE active = true;

CREATE TRIGGER vendors_set_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. activity_log 트리거 확장 (vendors 포함)
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

  ELSIF tg_table_name = 'sites' THEN
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

  ELSIF tg_table_name = 'vendors' THEN
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

CREATE TRIGGER vendors_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();


-- -----------------------------------------------------------------------------
-- 3. RLS
-- 모든 인증 사용자가 조회 가능 (발주서 작성 시 거래처 드롭다운 필요).
-- admin만 CRUD.
-- -----------------------------------------------------------------------------
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select_authenticated" ON public.vendors
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "vendors_admin_insert" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "vendors_admin_update" ON public.vendors
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "vendors_admin_delete" ON public.vendors
  FOR DELETE TO authenticated
  USING (public.is_admin());
