-- Supabase Advisor: 두 가지 함수 보안 경고 일괄 처리
--
-- 1) function_search_path_mutable
--    SET search_path 가 명시 안 된 함수 6개. 호출자가 search_path 를 조작해
--    같은 이름의 다른 schema 함수/테이블로 우회시킬 수 있음 (특히 SECURITY
--    DEFINER 에서 위험). 모두 'public, pg_temp' 로 고정.
--
-- 2) anon_security_definer_function_executable
--    public 스키마의 모든 함수는 PostgREST 를 통해 /rest/v1/rpc/* 로 노출되며
--    기본 GRANT 가 PUBLIC (anon 포함). SECURITY DEFINER 함수는 정의자 권한으로
--    실행되므로 미인증 사용자가 호출하면 권한 escalation 위험.
--    모든 SECURITY DEFINER 함수에서 anon 의 EXECUTE 권한 회수.
--    authenticated 권한은 그대로 유지 (server action 에서 정상 호출).

-- ─── 1. search_path 고정 ───────────────────────────────────────────────────
ALTER FUNCTION public.set_updated_at()                  SET search_path = public, pg_temp;
ALTER FUNCTION public.log_product_alias_activity()      SET search_path = public, pg_temp;
ALTER FUNCTION public.get_low_stock_products()          SET search_path = public, pg_temp;
ALTER FUNCTION public.get_products_summary()            SET search_path = public, pg_temp;
ALTER FUNCTION public.natural_sort_key(text)            SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_po_number()              SET search_path = public, pg_temp;

-- ─── 2. SECURITY DEFINER 함수의 anon 권한 회수 ─────────────────────────────
-- 함수 시그니처가 마이그레이션마다 흩어져 있어 동적으로 처리.
-- prosecdef = true 인 public 스키마 함수 전체를 순회.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS func_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public',
      rec.schema_name,
      rec.func_name,
      rec.func_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      rec.schema_name,
      rec.func_name,
      rec.func_args
    );
  END LOOP;
END $$;
