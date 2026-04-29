-- =============================================================================
-- Feature Batch — 5개 기능 + 2개 확장
--
-- 1. 지난 신청 복제 + 템플릿 (admin 공용 + 개인, 다중 선택 지원)
-- 2. 긴급 플래그 + 전역 알림 바
-- 3. 가용 재고 계산 (재고 - 대기 중 신청 남은 수량)
-- 5. 월말/준공 정산서 PDF (DB 변경 없음, 라우트에서 쿼리만)
-- 6. 거래처 단가 비교 (DB 변경 없음, 기존 vendor_product_prices 재사용)
-- 7. 재고 실사 모드 (자동/수동 조정 선택)
-- 9. 최근 처리 Undo (20분 내, 본인만)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1-A. request_templates — 자재 신청 템플릿
--     owner_id IS NULL + is_public=true  → admin 가 만든 공용 템플릿
--     owner_id = auth.uid()              → 개인 템플릿
-- -----------------------------------------------------------------------------
CREATE TABLE public.request_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public   boolean     NOT NULL DEFAULT false,
  name        text        NOT NULL,
  note        text,
  items       jsonb       NOT NULL,  -- [{product_id, requested_quantity, note}]
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT request_templates_owner_or_public CHECK (owner_id IS NOT NULL OR is_public)
);

COMMENT ON TABLE public.request_templates IS '자재 신청 템플릿 (공용/개인)';

CREATE INDEX request_templates_owner_idx   ON public.request_templates (owner_id);
CREATE INDEX request_templates_public_idx  ON public.request_templates (is_public) WHERE is_public;

CREATE TRIGGER request_templates_set_updated_at
  BEFORE UPDATE ON public.request_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.request_templates ENABLE ROW LEVEL SECURITY;

-- 사용자: 공용 + 본인 소유 SELECT
CREATE POLICY "tpl_select_public_or_own" ON public.request_templates
  FOR SELECT TO authenticated
  USING (is_public OR owner_id = auth.uid() OR public.is_admin());

-- 사용자: 본인 개인 템플릿 CRUD (공용 템플릿은 admin 전용)
CREATE POLICY "tpl_insert_own" ON public.request_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    (NOT is_public AND owner_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "tpl_update_own_or_admin" ON public.request_templates
  FOR UPDATE TO authenticated
  USING (
    (NOT is_public AND owner_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    (NOT is_public AND owner_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "tpl_delete_own_or_admin" ON public.request_templates
  FOR DELETE TO authenticated
  USING (
    (NOT is_public AND owner_id = auth.uid())
    OR public.is_admin()
  );


-- -----------------------------------------------------------------------------
-- 2. material_requests 긴급 플래그
-- -----------------------------------------------------------------------------
ALTER TABLE public.material_requests
  ADD COLUMN is_urgent     boolean NOT NULL DEFAULT false,
  ADD COLUMN urgent_reason text;

CREATE INDEX material_requests_urgent_submitted_idx
  ON public.material_requests (created_at DESC)
  WHERE is_urgent AND status = 'submitted';


-- -----------------------------------------------------------------------------
-- 9. transactions 취소(Undo) 컬럼
-- -----------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN canceled_at     timestamptz,
  ADD COLUMN canceled_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN canceled_reason text,
  ADD COLUMN related_tx_id   uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.transactions.related_tx_id IS
  'Undo 발생 시, 원본 ↔ 역방향 트랜잭션을 연결. 원본에는 역방향 tx id, 역방향에는 원본 tx id.';

CREATE INDEX transactions_canceled_idx
  ON public.transactions (created_at DESC)
  WHERE canceled_at IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 7. stock_audits — 재고 실사 기록
-- -----------------------------------------------------------------------------
CREATE TABLE public.stock_audits (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  db_quantity          integer     NOT NULL,
  counted_quantity     integer     NOT NULL CHECK (counted_quantity >= 0),
  difference           integer     NOT NULL,  -- counted - db (+:잉여, -:부족)
  resolution           text        NOT NULL
                         CHECK (resolution IN ('auto_adjusted', 'manual_pending', 'manual_resolved')),
  adjustment_tx_id     uuid        REFERENCES public.transactions(id) ON DELETE SET NULL,
  note                 text,
  created_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  resolved_at          timestamptz
);

COMMENT ON TABLE public.stock_audits IS '재고 실사 세션별 기록';

CREATE INDEX stock_audits_product_idx ON public.stock_audits (product_id);
CREATE INDEX stock_audits_created_idx ON public.stock_audits (created_at DESC);
CREATE INDEX stock_audits_pending_idx ON public.stock_audits (created_at DESC)
  WHERE resolution = 'manual_pending';

ALTER TABLE public.stock_audits ENABLE ROW LEVEL SECURITY;

-- admin만 조회/수정 가능 (재고 실사는 관리 업무)
CREATE POLICY "audit_admin_all" ON public.stock_audits
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- -----------------------------------------------------------------------------
-- RPC: get_inventory_availability
-- 재고 / 대기 중 신청 수량 / 가용 수량 분해.
--   "대기 중"  = material_requests.status IN ('submitted','approved') 이고
--               (requested_quantity - fulfilled_quantity) > 0 인 아이템 합계
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_inventory_availability(p_product_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  product_id uuid,
  stock      integer,
  pending    integer,
  available  integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  WITH pending_per_product AS (
    SELECT mri.product_id,
           SUM(mri.requested_quantity - mri.fulfilled_quantity)::integer AS pending_qty
      FROM public.material_request_items mri
      JOIN public.material_requests mr ON mr.id = mri.request_id
     WHERE mr.status IN ('submitted', 'approved')
       AND mri.requested_quantity > mri.fulfilled_quantity
     GROUP BY mri.product_id
  )
  SELECT p.id,
         p.quantity,
         coalesce(pp.pending_qty, 0),
         GREATEST(p.quantity - coalesce(pp.pending_qty, 0), 0)
    FROM public.products p
    LEFT JOIN pending_per_product pp ON pp.product_id = p.id
   WHERE p_product_ids IS NULL OR p.id = ANY(p_product_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_availability(uuid[]) TO authenticated;


-- -----------------------------------------------------------------------------
-- RPC: undo_transaction
-- 본인이 20분 이내에 작성한 입출고를 취소한다.
-- 원본에 canceled_at 기록 + 반대 방향 트랜잭션을 insert 하여 재고·이력을 되돌림.
-- 자재 신청/발주서 연계 출고는 보수적으로 차단 (note prefix 로 판단).
-- -----------------------------------------------------------------------------
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

  -- 역방향 계산
  v_reverse_type := CASE v_tx.type WHEN 'in' THEN 'out' WHEN 'out' THEN 'in' ELSE NULL END;
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


-- -----------------------------------------------------------------------------
-- RPC: record_stock_audit
-- 실사 수량이 DB 수량과 다를 때, mode 에 따라 처리:
--   'auto'   → 차이만큼 즉시 조정 트랜잭션 발행 (재고 맞춤)
--   'manual' → 차이만 기록 (admin 이 후속 처리)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_stock_audit(
  p_product_id       uuid,
  p_counted_quantity integer,
  p_mode             text,     -- 'auto' | 'manual'
  p_note             text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_product       public.products;
  v_diff          integer;
  v_adj_tx_id     uuid;
  v_audit_id      uuid;
  v_resolution    text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_mode NOT IN ('auto', 'manual') THEN
    RAISE EXCEPTION 'INVALID_MODE';
  END IF;

  IF p_counted_quantity < 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  v_diff := p_counted_quantity - v_product.quantity;

  IF p_mode = 'auto' AND v_diff <> 0 THEN
    -- 조정 트랜잭션 발행 (in: 잉여, out: 부족)
    UPDATE public.products
       SET quantity = p_counted_quantity, updated_at = now()
     WHERE id = p_product_id;

    INSERT INTO public.transactions (
      product_id, type, quantity, note, created_by, site_id
    ) VALUES (
      p_product_id,
      CASE WHEN v_diff > 0 THEN 'in' ELSE 'out' END,
      abs(v_diff),
      '실사 조정' || coalesce(' · ' || p_note, ''),
      auth.uid(),
      NULL
    )
    RETURNING id INTO v_adj_tx_id;

    v_resolution := 'auto_adjusted';
  ELSIF p_mode = 'auto' AND v_diff = 0 THEN
    v_resolution := 'auto_adjusted';   -- 차이 없음 == 이미 맞음
  ELSE
    v_resolution := 'manual_pending';
  END IF;

  INSERT INTO public.stock_audits (
    product_id, db_quantity, counted_quantity, difference,
    resolution, adjustment_tx_id, note, created_by,
    resolved_at
  ) VALUES (
    p_product_id, v_product.quantity, p_counted_quantity, v_diff,
    v_resolution, v_adj_tx_id, p_note, auth.uid(),
    CASE WHEN v_resolution = 'auto_adjusted' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'audit_id',     v_audit_id,
    'difference',   v_diff,
    'resolution',   v_resolution,
    'adjustment_tx_id', v_adj_tx_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_stock_audit(uuid, integer, text, text) TO authenticated;


-- -----------------------------------------------------------------------------
-- RPC: get_dashboard_alert_counts
-- 전역 알림 바 용: 긴급 대기 건수 / 일반 대기 건수
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_alert_counts()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT jsonb_build_object(
    'urgent',  count(*) FILTER (WHERE is_urgent = true),
    'pending', count(*) FILTER (WHERE is_urgent = false)
  )
  FROM public.material_requests
  WHERE status = 'submitted';
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_alert_counts() TO authenticated;
