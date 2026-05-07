-- Web Push 알림 인프라
-- Phase 1: 구독 저장 테이블 + 재고 부족 알림 일별 디듀프 로그
-- 발송 트리거 wiring 은 애플리케이션 레벨(server action)에서 처리.

-- =============================================================================
-- 1. push_subscriptions — 사용자 디바이스/브라우저별 푸시 구독
-- =============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 동일 endpoint 중복 방지. 한 사용자가 여러 기기/브라우저면 endpoint 별로 row.
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_uniq
  ON push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON push_subscriptions (user_id);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION push_subscriptions_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION push_subscriptions_set_updated_at();

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 행만 SELECT/INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS push_subscriptions_select_self ON push_subscriptions;
CREATE POLICY push_subscriptions_select_self ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_insert_self ON push_subscriptions;
CREATE POLICY push_subscriptions_insert_self ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_update_self ON push_subscriptions;
CREATE POLICY push_subscriptions_update_self ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_delete_self ON push_subscriptions;
CREATE POLICY push_subscriptions_delete_self ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- service_role 은 RLS bypass 가 default — admin 전체 발송 시 service role 로 조회.

COMMENT ON TABLE push_subscriptions IS 'Web Push API 구독 정보. 사용자가 알림 토글 ON 시 INSERT.';

-- =============================================================================
-- 2. low_stock_notified_log — 재고 부족 알림 일별 디듀프
-- =============================================================================
-- 정책: 같은 품목이 KST 같은 날에 여러 번 부족 진입해도 1회만 푸시.
-- 다음 날(KST 자정 기준)이면 새 row 가능.
CREATE TABLE IF NOT EXISTS low_stock_notified_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  notified_date date NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS low_stock_notified_log_product_date_uniq
  ON low_stock_notified_log (product_id, notified_date);
CREATE INDEX IF NOT EXISTS low_stock_notified_log_date_idx
  ON low_stock_notified_log (notified_date DESC);

ALTER TABLE low_stock_notified_log ENABLE ROW LEVEL SECURITY;

-- admin 만 조회 (운영 디버깅용). INSERT 는 service_role bypass.
DROP POLICY IF EXISTS low_stock_notified_log_admin_select ON low_stock_notified_log;
CREATE POLICY low_stock_notified_log_admin_select ON low_stock_notified_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE low_stock_notified_log IS '재고 부족 푸시 알림 일별 디듀프. KST 기준 (product_id, notified_date) 유니크.';
