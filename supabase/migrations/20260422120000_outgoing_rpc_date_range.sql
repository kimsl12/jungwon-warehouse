-- =============================================================================
-- Replace outgoing_by_user / outgoing_by_site VIEWS with RPC functions
-- that accept an optional (p_from, p_to) timestamptz range.
--
-- The views were fixed at "last 12 months". The /reports page now needs
-- interactive date range selection, so we expose SECURITY DEFINER functions
-- with default values that preserve the prior behaviour when no range is
-- supplied.
-- =============================================================================

DROP VIEW IF EXISTS public.outgoing_by_user;
DROP VIEW IF EXISTS public.outgoing_by_site;

CREATE OR REPLACE FUNCTION public.get_outgoing_by_user(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  user_id           uuid,
  transaction_count bigint,
  total_quantity    bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    t.created_by           AS user_id,
    count(*)::bigint       AS transaction_count,
    sum(t.quantity)::bigint AS total_quantity
  FROM public.transactions t
  WHERE t.type = 'out'
    AND t.created_at >= COALESCE(p_from, now() - interval '12 months')
    AND t.created_at <  COALESCE(p_to,   now() + interval '1 day')
  GROUP BY t.created_by
  ORDER BY total_quantity DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_outgoing_by_site(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  site_id           uuid,
  site_name         text,
  transaction_count bigint,
  total_quantity    bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    t.site_id              AS site_id,
    s.name                 AS site_name,
    count(*)::bigint       AS transaction_count,
    sum(t.quantity)::bigint AS total_quantity
  FROM public.transactions t
  LEFT JOIN public.sites s ON s.id = t.site_id
  WHERE t.type = 'out'
    AND t.created_at >= COALESCE(p_from, now() - interval '12 months')
    AND t.created_at <  COALESCE(p_to,   now() + interval '1 day')
  GROUP BY t.site_id, s.name
  ORDER BY total_quantity DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_outgoing_by_user(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_outgoing_by_site(timestamptz, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.get_outgoing_by_user IS '기간별 담당자 출고 집계. /reports 에서 사용.';
COMMENT ON FUNCTION public.get_outgoing_by_site IS '기간별 현장 출고 집계. /reports 에서 사용.';
