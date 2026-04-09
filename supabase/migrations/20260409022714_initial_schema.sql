-- =============================================================================
-- jungwon-warehouse — Initial schema (Phase 2)
--
-- Tables:    products, transactions, profiles, activity_logs
-- RPC:       process_transaction, bulk_import_products
-- Views:     monthly/daily/top_products summaries
-- Triggers:  activity logging, profile auto-create, updated_at maintenance
-- Security:  RLS enabled on all tables, helper is_admin()
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
create extension if not exists "pgcrypto";


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- profiles: 1:1 with auth.users, holds role
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  role       text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- products: inventory items
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text,
  unit         text,
  quantity     integer not null default 0 check (quantity >= 0),
  min_quantity integer not null default 0 check (min_quantity >= 0),
  location     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index products_name_idx     on public.products (name);
create index products_category_idx on public.products (category);

-- transactions: immutable in/out history
create table public.transactions (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  type       text not null check (type in ('in', 'out')),
  quantity   integer not null check (quantity > 0),
  note       text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index transactions_product_id_idx on public.transactions (product_id);
create index transactions_created_at_idx on public.transactions (created_at desc);
create index transactions_created_by_idx on public.transactions (created_by);

-- activity_logs: audit trail (insert-only via triggers)
create table public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null check (action in ('create', 'update', 'delete', 'in', 'out')),
  table_name text not null,
  record_id  uuid not null,
  details    jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_table_record_idx on public.activity_logs (table_name, record_id);
create index activity_logs_created_at_idx   on public.activity_logs (created_at desc);


-- =============================================================================
-- 3. HELPER FUNCTIONS
-- =============================================================================

-- Check if the current authenticated user is an admin.
-- SECURITY DEFINER so RLS on profiles doesn't recurse.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- =============================================================================
-- 4. AUTO-MAINTAIN updated_at
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 5. PROFILE AUTO-CREATE TRIGGER
-- =============================================================================
-- When a new auth.users row is inserted, create a matching profiles row.
-- All new users default to 'user' role; admin must be promoted manually.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- 6. ACTIVITY LOG TRIGGER
-- =============================================================================
-- Generic trigger for products + transactions.
-- For products UPDATE that only changes quantity/updated_at (driven by
-- process_transaction RPC), skip logging — the transactions row already
-- captures the change. This avoids duplicate audit entries.
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
      'note',       new.note
    );

  elsif tg_table_name = 'products' then
    if tg_op = 'INSERT' then
      v_action := 'create';
      v_record_id := new.id;
      v_details := to_jsonb(new);

    elsif tg_op = 'UPDATE' then
      -- Skip log if only quantity / updated_at changed (RPC-driven)
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

create trigger products_activity_log
  after insert or update or delete on public.products
  for each row execute function public.log_activity();

create trigger transactions_activity_log
  after insert on public.transactions
  for each row execute function public.log_activity();


-- =============================================================================
-- 7. RPC: process_transaction
-- =============================================================================
-- Atomic in/out transaction with stock check and low_stock flag.
-- SECURITY DEFINER so it bypasses RLS on transactions and can update products.
-- Locks the product row (FOR UPDATE) to prevent race conditions.
create or replace function public.process_transaction(
  p_product_id uuid,
  p_type       text,
  p_quantity   integer,
  p_note       text,
  p_user_id    uuid
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

  insert into public.transactions (product_id, type, quantity, note, created_by)
  values (p_product_id, p_type, p_quantity, p_note, p_user_id)
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


-- =============================================================================
-- 8. RPC: bulk_import_products
-- =============================================================================
-- CSV bulk import for admins. Skips duplicates by name.
create or replace function public.bulk_import_products(
  p_products jsonb,
  p_user_id  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_item     jsonb;
  v_inserted integer := 0;
  v_skipped  integer := 0;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  for v_item in select * from jsonb_array_elements(p_products)
  loop
    if exists (select 1 from public.products where name = v_item->>'name') then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.products (name, category, unit, quantity, min_quantity, location)
    values (
      v_item->>'name',
      v_item->>'category',
      v_item->>'unit',
      coalesce((v_item->>'quantity')::integer, 0),
      coalesce((v_item->>'min_quantity')::integer, 0),
      v_item->>'location'
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped);
end;
$$;


-- =============================================================================
-- 9. VIEWS
-- =============================================================================

-- Monthly transaction summary (last 12 months) for /reports
create or replace view public.monthly_transaction_summary as
select
  date_trunc('month', created_at) as month,
  type,
  sum(quantity)::bigint as total_quantity,
  count(*)::bigint      as transaction_count
from public.transactions
where created_at >= now() - interval '12 months'
group by date_trunc('month', created_at), type
order by month desc, type;

-- Daily transaction summary (last 7 days) for /overview
create or replace view public.daily_transaction_summary as
select
  date_trunc('day', created_at) as day,
  type,
  sum(quantity)::bigint as total_quantity,
  count(*)::bigint      as transaction_count
from public.transactions
where created_at >= now() - interval '7 days'
group by date_trunc('day', created_at), type
order by day desc, type;

-- Top 10 products by outgoing quantity (all-time) for /reports
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
group by t.product_id, p.name, p.category
order by total_outgoing desc
limit 10;


-- =============================================================================
-- 10. ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles      enable row level security;
alter table public.products      enable row level security;
alter table public.transactions  enable row level security;
alter table public.activity_logs enable row level security;


-- profiles ---------------------------------------------------------------------
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- products ---------------------------------------------------------------------
create policy "products_select_authenticated" on public.products
  for select to authenticated
  using (true);

create policy "products_admin_insert" on public.products
  for insert to authenticated
  with check (public.is_admin());

create policy "products_admin_update" on public.products
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_admin_delete" on public.products
  for delete to authenticated
  using (public.is_admin());


-- transactions -----------------------------------------------------------------
-- All authenticated users can read history.
-- Writes are blocked at RLS layer; the only write path is process_transaction
-- RPC, which runs as SECURITY DEFINER and bypasses RLS.
create policy "transactions_select_authenticated" on public.transactions
  for select to authenticated
  using (true);


-- activity_logs ----------------------------------------------------------------
-- Admin read only. No client write paths — only the SECURITY DEFINER trigger
-- functions can insert.
create policy "activity_logs_admin_select" on public.activity_logs
  for select to authenticated
  using (public.is_admin());


-- =============================================================================
-- 11. GRANTS
-- =============================================================================
grant execute on function public.process_transaction(uuid, text, integer, text, uuid) to authenticated;
grant execute on function public.bulk_import_products(jsonb, uuid)                     to authenticated;
grant execute on function public.is_admin()                                            to authenticated;

grant select on public.monthly_transaction_summary to authenticated;
grant select on public.daily_transaction_summary   to authenticated;
grant select on public.top_products_by_outgoing    to authenticated;
