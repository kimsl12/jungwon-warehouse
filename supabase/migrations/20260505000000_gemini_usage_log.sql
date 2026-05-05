-- AI 챗봇(Gemini) 호출 로그 + 일일 한도 가드 (Phase 2)
--
-- 한도 정책:
--   user  : 100회/day  (admin은 면제)
--   global: 1300회/day (admin도 적용 — Gemini 무료 티어 1500 RPD 미만 버퍼)
--   기준일 경계: Asia/Seoul 자정.
--
-- INSERT 는 record_gemini_usage RPC 경유만 허용 (RLS 로 직접 INSERT 차단).
-- 한도 체크는 check_gemini_quota RPC.

CREATE TABLE IF NOT EXISTS public.gemini_usage_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  model_used      text NOT NULL,
  fell_back       boolean NOT NULL DEFAULT false,
  prompt_tokens   integer,
  response_tokens integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gemini_usage_log_user_created_idx
  ON public.gemini_usage_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gemini_usage_log_created_idx
  ON public.gemini_usage_log (created_at DESC);

ALTER TABLE public.gemini_usage_log ENABLE ROW LEVEL SECURITY;

-- admin: 전체 SELECT (관리 페이지용)
CREATE POLICY "gemini_usage_log_admin_read"
  ON public.gemini_usage_log
  FOR SELECT
  USING (public.is_admin());

-- user: 본인 row 만 SELECT (개인 사용량 표시용)
CREATE POLICY "gemini_usage_log_self_read"
  ON public.gemini_usage_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE 정책 미정의 → 직접 변조 차단. RPC 만 사용.

-- =====================================================
-- 한도 체크 RPC — 호출 직전 가드
-- 반환: { allowed, reason, user_used, global_used, is_admin,
--         user_limit, global_limit }
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_gemini_quota()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      uuid;
  v_user_used    integer;
  v_global_used  integer;
  v_is_admin     boolean;
  v_today_start  timestamptz;
  v_user_limit   integer := 100;
  v_global_limit integer := 1300;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_is_admin := public.is_admin();

  -- 오늘 자정 (Asia/Seoul) 의 timestamptz
  v_today_start := (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul'))
                   AT TIME ZONE 'Asia/Seoul';

  SELECT count(*) INTO v_user_used
    FROM public.gemini_usage_log
   WHERE user_id = v_user_id
     AND created_at >= v_today_start;

  SELECT count(*) INTO v_global_used
    FROM public.gemini_usage_log
   WHERE created_at >= v_today_start;

  -- 전체 한도는 모두 적용 (Gemini API 자체 한도 보호)
  IF v_global_used >= v_global_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'GLOBAL_QUOTA_EXCEEDED',
      'user_used', v_user_used,
      'global_used', v_global_used,
      'is_admin', v_is_admin,
      'user_limit', v_user_limit,
      'global_limit', v_global_limit
    );
  END IF;

  -- 사용자 한도는 admin 면제
  IF NOT v_is_admin AND v_user_used >= v_user_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'USER_QUOTA_EXCEEDED',
      'user_used', v_user_used,
      'global_used', v_global_used,
      'is_admin', false,
      'user_limit', v_user_limit,
      'global_limit', v_global_limit
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', null,
    'user_used', v_user_used,
    'global_used', v_global_used,
    'is_admin', v_is_admin,
    'user_limit', v_user_limit,
    'global_limit', v_global_limit
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_gemini_quota() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_gemini_quota() TO authenticated;

-- =====================================================
-- 사용량 기록 RPC — 호출 성공 후
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_gemini_usage(
  p_model_used      text,
  p_fell_back       boolean,
  p_prompt_tokens   integer,
  p_response_tokens integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_id      uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  INSERT INTO public.gemini_usage_log (
    user_id, model_used, fell_back, prompt_tokens, response_tokens
  ) VALUES (
    v_user_id, p_model_used, p_fell_back, p_prompt_tokens, p_response_tokens
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_gemini_usage(text, boolean, integer, integer)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_gemini_usage(text, boolean, integer, integer)
  TO authenticated;

-- =====================================================
-- 일별 사용량 집계 RPC — admin 페이지 차트용
-- 최근 N일 (기본 14일) Asia/Seoul 기준 일별 호출수 + 모델별 분포
-- =====================================================

CREATE OR REPLACE FUNCTION public.gemini_usage_daily(p_days integer DEFAULT 14)
RETURNS TABLE (
  day              date,
  total_calls      bigint,
  flash_calls      bigint,
  flash_lite_calls bigint,
  fell_back_calls  bigint,
  unique_users     bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (created_at AT TIME ZONE 'Asia/Seoul')::date            AS day,
    count(*)                                                AS total_calls,
    count(*) FILTER (WHERE model_used = 'gemini-2.5-flash') AS flash_calls,
    count(*) FILTER (WHERE model_used = 'gemini-2.5-flash-lite') AS flash_lite_calls,
    count(*) FILTER (WHERE fell_back = true)                AS fell_back_calls,
    count(DISTINCT user_id)                                 AS unique_users
  FROM public.gemini_usage_log
  WHERE created_at >= now() - (p_days * interval '1 day')
    AND public.is_admin()
  GROUP BY (created_at AT TIME ZONE 'Asia/Seoul')::date
  ORDER BY day ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.gemini_usage_daily(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.gemini_usage_daily(integer) TO authenticated;

COMMENT ON TABLE public.gemini_usage_log IS
  'AI 챗봇(Gemini) 호출 로그. INSERT는 record_gemini_usage 경유. user는 본인만, admin은 전체 SELECT.';
COMMENT ON FUNCTION public.check_gemini_quota IS
  '호출 전 한도 가드. user 100/day(admin 면제), global 1300/day(전원 적용). Asia/Seoul 자정 기준.';
COMMENT ON FUNCTION public.record_gemini_usage IS
  '호출 성공 후 사용량 기록. auth.uid() 자동 사용.';
COMMENT ON FUNCTION public.gemini_usage_daily IS
  '최근 N일 일별 사용량 집계. admin 전용 (함수 내부 가드).';
