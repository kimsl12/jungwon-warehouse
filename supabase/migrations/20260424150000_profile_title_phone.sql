-- =============================================================================
-- profiles 확장 — 직급(title) + 연락처(phone) 컬럼 추가
--
-- 발주서 PDF의 담당자 칸을 작성자 본인 정보로 자동 채우기 위해 필요.
-- NULL 허용. admin은 /users 페이지에서 모든 사용자 값을 편집 가능.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.title IS '직급 (발주서 담당자 칸 표기용. 예: "차장")';
COMMENT ON COLUMN public.profiles.phone IS '담당자 연락처 (발주서·출고장용. 예: "010-0000-0000")';


-- update_user_role RPC는 role만 변경하므로 그대로 유지.
-- 직급·연락처 편집은 RLS 기반으로 일반 UPDATE 경로 사용
-- (admin이 profiles UPDATE 가능).


-- profiles 테이블의 admin UPDATE 정책이 이미 있지만 title/phone까지 허용하도록
-- 재확인. 기존 "profiles_admin_all" 정책으로 이미 커버됨 (모든 컬럼 UPDATE).
