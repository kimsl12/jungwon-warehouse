-- =============================================================================
-- 거래처별 품목 단가표 (vendor_product_prices)
--
-- 같은 품목도 거래처에 따라 단가가 다르므로 (vendor_id, product_id) 조합으로
-- 단가를 저장. 발주서 작성 시 거래처 선택 → 해당 거래처의 취급 품목·단가가
-- 자동 채워지는 흐름에 사용된다.
--
-- - 단가: integer(원). Krw 기준 소수점 불필요.
-- - 단가 미등록 품목도 발주 가능 (발주서 작성 시 수동 입력).
-- =============================================================================


CREATE TABLE public.vendor_product_prices (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid        NOT NULL REFERENCES public.vendors(id)  ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unit_price  integer     NOT NULL CHECK (unit_price >= 0),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, product_id)
);

COMMENT ON TABLE public.vendor_product_prices IS '거래처별 품목 단가. 발주서 단가 자동 채우기용.';

CREATE INDEX vendor_product_prices_vendor_idx  ON public.vendor_product_prices (vendor_id);
CREATE INDEX vendor_product_prices_product_idx ON public.vendor_product_prices (product_id);

CREATE TRIGGER vendor_product_prices_set_updated_at
  BEFORE UPDATE ON public.vendor_product_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- RLS: 인증 사용자 조회 가능 (발주서 작성 시 가격 조회), admin만 CUD
-- -----------------------------------------------------------------------------
ALTER TABLE public.vendor_product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vpp_select_authenticated" ON public.vendor_product_prices
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "vpp_admin_insert" ON public.vendor_product_prices
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "vpp_admin_update" ON public.vendor_product_prices
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "vpp_admin_delete" ON public.vendor_product_prices
  FOR DELETE TO authenticated
  USING (public.is_admin());
