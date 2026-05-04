-- 거래처별 입고 집계 RPC — 기간 필터, PO 기반.
-- 부분 수령 (receiving) 포함, received_quantity > 0 라인만 집계.
-- 기준 시점은 PO 의 completed_at (전체 입고 완료) 가 아니라
-- 개별 receipt 발생일 — 즉 transactions.created_at — 가 정확하지만
-- 별도 receipt 테이블이 없어 PO completed_at 또는 created_at fallback 사용.
--
-- 단순화: PO completed_at IS NOT NULL 이면 completed_at, 아니면 created_at
-- 을 기준으로 기간 필터.

CREATE OR REPLACE FUNCTION public.get_vendor_inbound_by_period(
  p_from timestamptz,
  p_to   timestamptz
)
RETURNS TABLE (
  vendor_id          uuid,
  vendor_name        text,
  total_quantity     bigint,
  total_amount       bigint,
  po_count           bigint,
  received_po_count  bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    v.id   AS vendor_id,
    v.name AS vendor_name,
    COALESCE(SUM(poi.received_quantity), 0)::bigint AS total_quantity,
    COALESCE(SUM(poi.received_quantity * poi.unit_price), 0)::bigint AS total_amount,
    COUNT(DISTINCT po.id)::bigint AS po_count,
    COUNT(DISTINCT CASE WHEN po.status = 'received' THEN po.id END)::bigint AS received_po_count
  FROM public.purchase_orders po
  JOIN public.vendors v
    ON v.id = po.vendor_id
  JOIN public.purchase_order_items poi
    ON poi.purchase_order_id = po.id
  WHERE po.status IN ('receiving', 'received')
    AND poi.received_quantity > 0
    AND COALESCE(po.completed_at, po.created_at) >= p_from
    AND COALESCE(po.completed_at, po.created_at) <  p_to
  GROUP BY v.id, v.name
  ORDER BY total_amount DESC, total_quantity DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_vendor_inbound_by_period(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_vendor_inbound_by_period(timestamptz, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.get_vendor_inbound_by_period IS
  '거래처별 입고 집계 (PO 기반). 부분 수령 포함, 금액·수량·PO 건수 함께 반환.';
