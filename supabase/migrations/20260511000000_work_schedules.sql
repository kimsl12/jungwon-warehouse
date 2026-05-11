-- 작업 일정 캘린더 — Phase 1
-- 현장별 단일 날짜 작업 일정 + 작업자 배정.
-- 자재 신청과는 분리. 시간 정밀도는 날짜만.

-- =============================================================================
-- work_schedules — 작업 일정 단일 row (날짜 단위)
-- =============================================================================
CREATE TABLE IF NOT EXISTS work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  title text NOT NULL,
  work_date date NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_schedules_title_not_empty CHECK (length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS work_schedules_work_date_idx
  ON work_schedules (work_date DESC);
CREATE INDEX IF NOT EXISTS work_schedules_site_id_idx
  ON work_schedules (site_id);

CREATE OR REPLACE FUNCTION work_schedules_set_updated_at()
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

DROP TRIGGER IF EXISTS work_schedules_updated_at ON work_schedules;
CREATE TRIGGER work_schedules_updated_at
  BEFORE UPDATE ON work_schedules
  FOR EACH ROW EXECUTE FUNCTION work_schedules_set_updated_at();

-- =============================================================================
-- work_schedule_assignees — 일정-작업자 조인 테이블
-- =============================================================================
CREATE TABLE IF NOT EXISTS work_schedule_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_schedule_id uuid NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS work_schedule_assignees_uniq
  ON work_schedule_assignees (work_schedule_id, user_id);
CREATE INDEX IF NOT EXISTS work_schedule_assignees_user_id_idx
  ON work_schedule_assignees (user_id);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedule_assignees ENABLE ROW LEVEL SECURITY;

-- admin: 전체 권한
DROP POLICY IF EXISTS work_schedules_admin_all ON work_schedules;
CREATE POLICY work_schedules_admin_all ON work_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- user: 본인 배정된 일정만 SELECT
DROP POLICY IF EXISTS work_schedules_user_select_own ON work_schedules;
CREATE POLICY work_schedules_user_select_own ON work_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_schedule_assignees a
      WHERE a.work_schedule_id = work_schedules.id
        AND a.user_id = auth.uid()
    )
  );

-- assignees: admin 전권
DROP POLICY IF EXISTS work_schedule_assignees_admin_all ON work_schedule_assignees;
CREATE POLICY work_schedule_assignees_admin_all ON work_schedule_assignees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- assignees: user 는 본인 배정된 일정의 모든 배정자 row 조회 가능 (같이 가는 동료 확인)
DROP POLICY IF EXISTS work_schedule_assignees_user_select_team ON work_schedule_assignees;
CREATE POLICY work_schedule_assignees_user_select_team ON work_schedule_assignees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_schedule_assignees self
      WHERE self.work_schedule_id = work_schedule_assignees.work_schedule_id
        AND self.user_id = auth.uid()
    )
  );

COMMENT ON TABLE work_schedules IS '작업 일정 (날짜 단위). admin 작성, user 본인 배정 일정만 조회.';
COMMENT ON TABLE work_schedule_assignees IS '작업 일정-작업자 조인. user_id = auth.users.id.';
