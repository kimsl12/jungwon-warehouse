-- Phase 2: 함수별 보안 모델 정밀화
--
-- 0029 authenticated_security_definer_function_executable 경고 26건 중
-- 실제 권한 elevation 이 필요 없는 함수를 INVOKER 로 전환하고,
-- 트리거 전용 함수는 EXECUTE 자체를 회수해 RPC 노출 차단.
--
-- C 그룹 (DML / RLS 헬퍼) 14개는 의도된 SECURITY DEFINER 로 유지 —
-- Advisor UI 에서 dismiss.

-- ─── A. 단순 SELECT 헬퍼 → SECURITY INVOKER ────────────────────────────────
-- 모두 products / transactions 단순 조회. RLS 가 authenticated 에 SELECT
-- 허용이라 호출자 권한으로 동일 결과.
ALTER FUNCTION public.get_low_stock_products()                       SECURITY INVOKER;
ALTER FUNCTION public.get_products_summary()                         SECURITY INVOKER;
ALTER FUNCTION public.get_inventory_availability(uuid[])             SECURITY INVOKER;
ALTER FUNCTION public.get_outgoing_by_user(timestamptz, timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.get_outgoing_by_site(timestamptz, timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.get_dashboard_alert_counts()                   SECURITY INVOKER;
ALTER FUNCTION public.search_products(text, text)                    SECURITY INVOKER;

-- ─── B. 트리거 / 내부 헬퍼 → 모든 EXECUTE 회수 ─────────────────────────────
-- 트리거는 EXECUTE 권한 검사 없이 호출되므로 RPC 노출만 차단해도 무방.
-- generate_po_number 는 PO INSERT 트리거에서 호출되며 RPC 호출 의미 없음.
REVOKE EXECUTE ON FUNCTION public.set_updated_at()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_activity()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_product_alias_activity()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_po_number()               FROM PUBLIC, anon, authenticated;

-- 참고: C 그룹 (DML/RLS 헬퍼) 은 의도된 SECURITY DEFINER 로 유지.
--   process_transaction, approve_material_request, create_purchase_order,
--   is_admin, is_site_assigned 등은 server action 통제 + 함수 내부 권한
--   검증이 있어 authenticated EXECUTE 가 필요함. Advisor 경고는 의도된
--   보안 모델임을 표시하기 위해 Advisor UI 에서 dismiss.
