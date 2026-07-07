-- =============================================================================
-- 거래처 단가 이력 (vendor_product_price_history)
--
-- 문제: vendor_product_prices 는 (vendor_id, product_id) UNIQUE 덮어쓰기형이라
-- 과거 단가를 복원할 수 없다. 정산서(site-statement)가 "지금 시점 최신 단가"로
-- 금액을 계산하므로, 과거 기간 정산서를 단가 인상 후 재발급하면 금액이 달라져
-- 거래처와 분쟁 소지가 있었다.
--
-- 해법:
--   1) append-only 이력 테이블 + 트리거 (INSERT/단가 변경 UPDATE 시 자동 기록)
--   2) 기존 단가를 이력의 시작점으로 시드
--   3) get_prices_as_of(): 특정 시점 기준 품목별 단가 조회 RPC
--      - 시점 이전 이력 중 최신 1개
--      - 시점 이전 이력이 없으면(단가를 나중에 등록) 가장 이른 이력으로 폴백
--        (append-only 라 폴백 값도 재발급 시 변하지 않음)
-- =============================================================================

CREATE TABLE public.vendor_product_price_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid        NOT NULL REFERENCES public.vendors(id)  ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unit_price  integer     NOT NULL CHECK (unit_price >= 0),
  changed_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendor_product_price_history IS
  '거래처 단가 변경 이력 (append-only). 정산서의 기간 기준 단가 산정용.';

CREATE INDEX vendor_product_price_history_product_changed_idx
  ON public.vendor_product_price_history (product_id, changed_at DESC);

-- RLS: 조회는 인증 사용자, 기록은 트리거(SECURITY DEFINER)만
ALTER TABLE public.vendor_product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vpph_select_authenticated" ON public.vendor_product_price_history
  FOR SELECT TO authenticated USING (true);

-- 기존 단가를 이력 시작점으로 시드 (등록 시점 created_at 사용 — 최선의 근사)
INSERT INTO public.vendor_product_price_history (vendor_id, product_id, unit_price, changed_at)
SELECT vendor_id, product_id, unit_price, created_at
FROM public.vendor_product_prices;

-- 트리거: 단가 등록/변경 시 이력 자동 기록
CREATE OR REPLACE FUNCTION public.log_vendor_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.unit_price IS DISTINCT FROM OLD.unit_price THEN
    INSERT INTO public.vendor_product_price_history
      (vendor_id, product_id, unit_price, changed_at)
    VALUES (NEW.vendor_id, NEW.product_id, NEW.unit_price, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vendor_product_prices_log_history
  AFTER INSERT OR UPDATE ON public.vendor_product_prices
  FOR EACH ROW EXECUTE FUNCTION public.log_vendor_price_change();

-- 특정 시점 기준 품목별 단가 조회 (정산서용)
CREATE OR REPLACE FUNCTION public.get_prices_as_of(
  p_product_ids uuid[],
  p_as_of       timestamptz
)
RETURNS TABLE (product_id uuid, unit_price integer)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (h.product_id)
    h.product_id,
    h.unit_price
  FROM public.vendor_product_price_history h
  WHERE h.product_id = ANY(p_product_ids)
  ORDER BY
    h.product_id,
    (h.changed_at <= p_as_of) DESC,                                -- 시점 이전 이력 우선
    CASE WHEN h.changed_at <= p_as_of THEN h.changed_at END DESC NULLS LAST,  -- 그중 최신
    h.changed_at ASC;                                              -- 전부 시점 이후면 가장 이른 것
$$;

GRANT EXECUTE ON FUNCTION public.get_prices_as_of(uuid[], timestamptz) TO authenticated;
