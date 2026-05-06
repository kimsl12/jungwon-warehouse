-- Phase 6: Gemini 이미지 생성 (Nano Banana) 통합
--
-- 1) gemini_usage_log 에 image_generated 컬럼 추가
-- 2) record_gemini_usage RPC 에 p_image_generated 파라미터 추가
-- 3) gemini_usage_daily RPC 에 image_calls 컬럼 추가

ALTER TABLE public.gemini_usage_log
  ADD COLUMN IF NOT EXISTS image_generated boolean NOT NULL DEFAULT false;

-- =====================================================
-- record_gemini_usage v2 — image_generated 파라미터 추가
-- =====================================================
DROP FUNCTION IF EXISTS public.record_gemini_usage(text, boolean, integer, integer);

CREATE OR REPLACE FUNCTION public.record_gemini_usage(
  p_model_used      text,
  p_fell_back       boolean,
  p_prompt_tokens   integer,
  p_response_tokens integer,
  p_image_generated boolean DEFAULT false
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
    user_id, model_used, fell_back, prompt_tokens, response_tokens, image_generated
  ) VALUES (
    v_user_id, p_model_used, p_fell_back, p_prompt_tokens, p_response_tokens, p_image_generated
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_gemini_usage(text, boolean, integer, integer, boolean)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_gemini_usage(text, boolean, integer, integer, boolean)
  TO authenticated;

-- =====================================================
-- gemini_usage_daily v2 — image_calls 컬럼 추가
-- =====================================================
DROP FUNCTION IF EXISTS public.gemini_usage_daily(integer);

CREATE OR REPLACE FUNCTION public.gemini_usage_daily(p_days integer DEFAULT 14)
RETURNS TABLE (
  day              date,
  total_calls      bigint,
  flash_calls      bigint,
  flash_lite_calls bigint,
  fell_back_calls  bigint,
  unique_users     bigint,
  image_calls      bigint
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
    count(DISTINCT user_id)                                 AS unique_users,
    count(*) FILTER (WHERE image_generated = true)          AS image_calls
  FROM public.gemini_usage_log
  WHERE created_at >= now() - (p_days * interval '1 day')
    AND public.is_admin()
  GROUP BY (created_at AT TIME ZONE 'Asia/Seoul')::date
  ORDER BY day ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.gemini_usage_daily(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.gemini_usage_daily(integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
