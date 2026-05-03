-- 사용자(auth.users) 삭제 시 자재신청 이력은 보존하되 작성자만 NULL 로.
-- 기존: material_requests.created_by 가 NOT NULL + ON DELETE RESTRICT 라서
-- 자재신청 한 적 있는 사용자는 삭제 자체가 불가능했음.
-- 운영상 테스트 계정·퇴사자 정리가 필요해 SET NULL 로 완화.

ALTER TABLE public.material_requests
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.material_requests
  DROP CONSTRAINT IF EXISTS material_requests_created_by_fkey;

ALTER TABLE public.material_requests
  ADD CONSTRAINT material_requests_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
