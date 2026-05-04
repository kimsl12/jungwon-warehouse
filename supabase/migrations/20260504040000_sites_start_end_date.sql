-- 현장 마스터에 착공일(start_date) / 준공일(end_date) 추가.
-- 둘 다 nullable — 기존 현장은 NULL 로 남으며, 이후 수정 시 입력.
-- 별도 인덱스: 목록 정렬 기준이 start_date DESC 가 될 예정.

ALTER TABLE public.sites
  ADD COLUMN start_date date,
  ADD COLUMN end_date   date;

-- 정렬용 인덱스 (NULLS LAST 는 정렬 시점에서 처리, 인덱스는 plain DESC)
CREATE INDEX sites_start_date_idx ON public.sites (start_date DESC);

COMMENT ON COLUMN public.sites.start_date IS '착공일 (현장 작업 시작일)';
COMMENT ON COLUMN public.sites.end_date   IS '준공일 (현장 작업 완료일)';
