-- =============================================================================
-- 취소(canceled_at)·역방향(related_tx_id) 트랜잭션을 모든 집계에서 제외.
--
-- undo_transaction / admin_cancel_transaction 은 원본에 canceled_at 을 마킹하고
-- 역방향 트랜잭션을 insert 한다. 두 행 모두 집계에 포함되면:
--   - 입고 100 취소 시 → 월별 요약에 입고 +100, 출고 +100 으로 이중 계상
--   - /overview 7일 차트, /reports 12개월 추이·Top10·담당자별·현장별 모두 부풀려짐
--
-- 필터: canceled_at IS NULL AND related_tx_id IS NULL
--   (원본 취소 행은 canceled_at, 역방향 행은 related_tx_id 가 설정됨)
-- =============================================================================

-- 1. 월별 요약 (/reports 12개월 추이)
create or replace view public.monthly_transaction_summary as
select
  date_trunc('month', created_at) as month,
  type,
  sum(quantity)::bigint as total_quantity,
  count(*)::bigint      as transaction_count
from public.transactions
where created_at >= now() - interval '12 months'
  and canceled_at is null
  and related_tx_id is null
group by date_trunc('month', created_at), type
order by month desc, type;

-- 2. 일별 요약 (/overview 7일 차트)
create or replace view public.daily_transaction_summary as
select
  date_trunc('day', created_at) as day,
  type,
  sum(quantity)::bigint as total_quantity,
  count(*)::bigint      as transaction_count
from public.transactions
where created_at >= now() - interval '7 days'
  and canceled_at is null
  and related_tx_id is null
group by date_trunc('day', created_at), type
order by day desc, type;

-- 3. 출고 상위 품목 Top 10 (/reports)
create or replace view public.top_products_by_outgoing as
select
  t.product_id,
  p.name,
  p.category,
  sum(t.quantity)::bigint as total_outgoing,
  count(*)::bigint        as transaction_count
from public.transactions t
join public.products p on p.id = t.product_id
where t.type = 'out'
  and t.canceled_at is null
  and t.related_tx_id is null
group by t.product_id, p.name, p.category
order by total_outgoing desc
limit 10;

-- create or replace view 가 reloptions 를 보존하지 않을 수 있으므로 재적용
-- (20260504010000_views_security_invoker.sql 과 동일 설정 유지)
alter view public.monthly_transaction_summary set (security_invoker = true);
alter view public.daily_transaction_summary   set (security_invoker = true);
alter view public.top_products_by_outgoing    set (security_invoker = true);

-- 4. 담당자별 출고 집계 (/reports)
create or replace function public.get_outgoing_by_user(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  user_id           uuid,
  transaction_count bigint,
  total_quantity    bigint
)
language sql stable security definer
set search_path = public, auth
as $$
  select
    t.created_by            as user_id,
    count(*)::bigint        as transaction_count,
    sum(t.quantity)::bigint as total_quantity
  from public.transactions t
  where t.type = 'out'
    and t.canceled_at is null
    and t.related_tx_id is null
    and t.created_at >= coalesce(p_from, now() - interval '12 months')
    and t.created_at <  coalesce(p_to,   now() + interval '1 day')
  group by t.created_by
  order by total_quantity desc nulls last;
$$;

-- 5. 현장별 출고 집계 (/reports)
create or replace function public.get_outgoing_by_site(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  site_id           uuid,
  site_name         text,
  transaction_count bigint,
  total_quantity    bigint
)
language sql stable security definer
set search_path = public, auth
as $$
  select
    t.site_id               as site_id,
    s.name                  as site_name,
    count(*)::bigint        as transaction_count,
    sum(t.quantity)::bigint as total_quantity
  from public.transactions t
  left join public.sites s on s.id = t.site_id
  where t.type = 'out'
    and t.canceled_at is null
    and t.related_tx_id is null
    and t.created_at >= coalesce(p_from, now() - interval '12 months')
    and t.created_at <  coalesce(p_to,   now() + interval '1 day')
  group by t.site_id, s.name
  order by total_quantity desc nulls last;
$$;
