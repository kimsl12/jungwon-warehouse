-- Supabase Advisor CRITICAL: View 가 기본값인 SECURITY DEFINER 로 정의되어
-- view 생성자(postgres superuser) 권한으로 실행 → 쿼리하는 사용자의 RLS 를
-- 우회할 수 있음. 모든 집계 view 를 SECURITY INVOKER 로 전환 — 쿼리하는
-- 사용자 권한으로 실행되어 RLS 가 정상 적용됨.
--
-- 현재 transactions SELECT 정책은 모든 authenticated 에게 허용이라 동작에는
-- 변화 없으나, 향후 RLS 정책이 강화되어도 view 가 우회하지 않도록 차단.
--
-- 참고: outgoing_by_user / outgoing_by_site 는 마이그레이션
-- 20260422120000 에서 RPC 함수로 교체되며 DROP 됨 → 여기 포함 X.

ALTER VIEW public.daily_transaction_summary   SET (security_invoker = true);
ALTER VIEW public.monthly_transaction_summary SET (security_invoker = true);
ALTER VIEW public.top_products_by_outgoing    SET (security_invoker = true);
