-- =============================================================================
-- Phase 9 — Sites (현장) master + transactions.site_id
--
-- - sites: 현장 마스터 (admin이 미리 등록, "미지정" 같은 항목도 사용자가
--   직접 만듦). archive 기능 포함 — 이미 이력이 쌓인 현장은 삭제 불가
--   (FK on delete restrict). 운영 종료 시엔 active=false로 비활성화.
-- - transactions.site_id: nullable (입고는 비울 수 있음). 출고는 RPC에서
--   강제. 옛 데이터는 NULL로 남음 (Phase 9 진입 전 cleanup으로 0건)
-- - 인원별/현장별 출고 통계 view 2개 추가 (Reports 페이지용)
-- =============================================================================


-- =============================================================================
-- 1. sites
-- =============================================================================
create table public.sites (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  contact    text,
  note       text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index sites_name_unique on public.sites (name);
create index sites_active_idx on public.sites (active) where active = true;

create trigger sites_set_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 2. transactions.site_id
-- =============================================================================
alter table public.transactions
  add column site_id uuid references public.sites(id) on delete restrict;

create index transactions_site_id_idx on public.transactions (site_id);


-- =============================================================================
-- 3. process_transaction RPC update
--
-- Drop & recreate (signature change). Now requires p_site_id when type='out'.
-- =============================================================================
drop function if exists public.process_transaction(uuid, text, integer, text, uuid);

create or replace function public.process_transaction(
  p_product_id uuid,
  p_type       text,
  p_quantity   integer,
  p_note       text,
  p_user_id    uuid,
  p_site_id    uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_product        public.products;
  v_new_quantity   integer;
  v_low_stock      boolean := false;
  v_transaction_id uuid;
begin
  -- Validate inputs
  if p_type not in ('in', 'out') then
    raise exception 'INVALID_TYPE';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;
  -- Site is required for outgoing transactions
  if p_type = 'out' and p_site_id is null then
    raise exception 'SITE_REQUIRED';
  end if;
  -- If a site is provided, it must exist and be active
  if p_site_id is not null then
    if not exists (
      select 1 from public.sites where id = p_site_id and active = true
    ) then
      raise exception 'SITE_NOT_FOUND_OR_INACTIVE';
    end if;
  end if;

  -- Lock product row to prevent concurrent modification
  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  -- Compute new quantity, reject negative stock
  if p_type = 'in' then
    v_new_quantity := v_product.quantity + p_quantity;
  else
    v_new_quantity := v_product.quantity - p_quantity;
    if v_new_quantity < 0 then
      raise exception 'INSUFFICIENT_STOCK';
    end if;
  end if;

  update public.products
     set quantity   = v_new_quantity,
         updated_at = now()
   where id = p_product_id;

  insert into public.transactions (product_id, type, quantity, note, created_by, site_id)
  values (p_product_id, p_type, p_quantity, p_note, p_user_id, p_site_id)
  returning id into v_transaction_id;

  if v_new_quantity <= v_product.min_quantity then
    v_low_stock := true;
  end if;

  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'product_id',     p_product_id,
    'new_quantity',   v_new_quantity,
    'low_stock',      v_low_stock
  );
end;
$$;

grant execute on function public.process_transaction(uuid, text, integer, text, uuid, uuid) to authenticated;


-- =============================================================================
-- 4. Activity log trigger update — include site_id in details for transactions
-- =============================================================================
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id   uuid := auth.uid();
  v_action    text;
  v_record_id uuid;
  v_details   jsonb;
begin
  if tg_table_name = 'transactions' and tg_op = 'INSERT' then
    v_action := new.type;
    v_record_id := new.id;
    v_details := jsonb_build_object(
      'product_id', new.product_id,
      'quantity',   new.quantity,
      'note',       new.note,
      'site_id',    new.site_id
    );

  elsif tg_table_name = 'products' then
    if tg_op = 'INSERT' then
      v_action := 'create';
      v_record_id := new.id;
      v_details := to_jsonb(new);

    elsif tg_op = 'UPDATE' then
      if (to_jsonb(new) - 'quantity' - 'updated_at')
       = (to_jsonb(old) - 'quantity' - 'updated_at') then
        return new;
      end if;
      v_action := 'update';
      v_record_id := new.id;
      v_details := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));

    elsif tg_op = 'DELETE' then
      v_action := 'delete';
      v_record_id := old.id;
      v_details := to_jsonb(old);
    end if;

  elsif tg_table_name = 'sites' then
    if tg_op = 'INSERT' then
      v_action := 'create';
      v_record_id := new.id;
      v_details := to_jsonb(new);
    elsif tg_op = 'UPDATE' then
      v_action := 'update';
      v_record_id := new.id;
      v_details := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
    elsif tg_op = 'DELETE' then
      v_action := 'delete';
      v_record_id := old.id;
      v_details := to_jsonb(old);
    end if;
  end if;

  if v_action is not null then
    insert into public.activity_logs (user_id, action, table_name, record_id, details)
    values (v_user_id, v_action, tg_table_name, v_record_id, v_details);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger sites_activity_log
  after insert or update or delete on public.sites
  for each row execute function public.log_activity();


-- =============================================================================
-- 5. RLS policies for sites
--
-- All authenticated users can read (needed for the dropdown). Only admins
-- can create / update / delete.
-- =============================================================================
alter table public.sites enable row level security;

create policy "sites_select_authenticated" on public.sites
  for select to authenticated
  using (true);

create policy "sites_admin_insert" on public.sites
  for insert to authenticated
  with check (public.is_admin());

create policy "sites_admin_update" on public.sites
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "sites_admin_delete" on public.sites
  for delete to authenticated
  using (public.is_admin());


-- =============================================================================
-- 6. Reports views
--
-- Per-user outgoing summary (user_id, total quantity, transaction count)
-- Per-site outgoing summary (site_id, total quantity, transaction count)
--
-- Both summarize the last 12 months only — keeps the views cheap and
-- focuses on actionable recent data.
-- =============================================================================
create or replace view public.outgoing_by_user as
select
  t.created_by         as user_id,
  count(*)::bigint     as transaction_count,
  sum(t.quantity)::bigint as total_quantity
from public.transactions t
where t.type = 'out'
  and t.created_at >= now() - interval '12 months'
group by t.created_by
order by total_quantity desc nulls last;

create or replace view public.outgoing_by_site as
select
  t.site_id            as site_id,
  s.name               as site_name,
  count(*)::bigint     as transaction_count,
  sum(t.quantity)::bigint as total_quantity
from public.transactions t
left join public.sites s on s.id = t.site_id
where t.type = 'out'
  and t.created_at >= now() - interval '12 months'
group by t.site_id, s.name
order by total_quantity desc nulls last;

grant select on public.outgoing_by_user to authenticated;
grant select on public.outgoing_by_site to authenticated;
