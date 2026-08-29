alter table public.fees
add column if not exists cash_adjustment_amount numeric not null default 0;

create table if not exists public.treasury_movements (
  id text primary key,
  fee_id text not null references public.fees(id) on delete cascade,
  month text not null,
  movement_type text not null default 'egreso',
  category text not null default 'otro',
  amount numeric not null check (amount >= 0),
  occurred_at date not null,
  description text default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.treasury_movements
add column if not exists source text not null default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'treasury_movements_movement_type_check'
  ) then
    alter table public.treasury_movements
    add constraint treasury_movements_movement_type_check
    check (movement_type in ('egreso'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'treasury_movements_category_check'
  ) then
    alter table public.treasury_movements
    add constraint treasury_movements_category_check
    check (category in ('entrenamiento', 'domingo', 'seguro_documentacion', 'aporte_club', 'otro'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'treasury_movements_source_check'
  ) then
    alter table public.treasury_movements
    add constraint treasury_movements_source_check
    check (source in ('manual', 'auto'));
  end if;
end;
$$;

create index if not exists treasury_movements_fee_active_idx
on public.treasury_movements (fee_id, active, occurred_at);

alter table public.treasury_movements enable row level security;

drop policy if exists "treasury_movements_no_direct_select" on public.treasury_movements;
drop policy if exists "treasury_movements_no_direct_insert" on public.treasury_movements;
drop policy if exists "treasury_movements_no_direct_update" on public.treasury_movements;
drop policy if exists "treasury_movements_no_direct_delete" on public.treasury_movements;

create or replace function public.admin_upsert_fee(
  p_admin_pin text,
  p_fee jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month text := p_fee->>'month';
  v_training_session_cost numeric := coalesce((p_fee->>'training_session_cost')::numeric, 0);
  v_sunday_cost numeric := coalesce((p_fee->>'sunday_cost')::numeric, 0);
  v_training_billing_base numeric := nullif(p_fee->>'training_billing_base', '')::numeric;
  v_sunday_billing_base numeric := nullif(p_fee->>'sunday_billing_base', '')::numeric;
  v_fixed_training_only_amount numeric := nullif(p_fee->>'fixed_training_only_amount', '')::numeric;
  v_fixed_competitor_amount numeric := nullif(p_fee->>'fixed_competitor_amount', '')::numeric;
  v_cash_adjustment_amount numeric := coalesce((p_fee->>'cash_adjustment_amount')::numeric, 0);
  v_interest_percent numeric := coalesce((p_fee->>'interest_percent')::numeric, 0);
  v_due_day integer := coalesce((p_fee->>'due_day')::integer, 10);
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if coalesce(p_fee->>'id', '') = '' or coalesce(v_month, '') !~ '^\d{4}-\d{2}$' then
    raise exception 'Cuota invalida';
  end if;

  if v_training_session_cost <= 0 or v_sunday_cost < 0 or v_interest_percent < 0 then
    raise exception 'Valores de cuota invalidos';
  end if;

  if v_due_day < 1 or v_due_day > 31 then
    raise exception 'Dia de vencimiento invalido';
  end if;

  insert into public.fees (
    id,
    month,
    training_session_cost,
    sunday_cost,
    training_billing_base,
    sunday_billing_base,
    fixed_training_only_amount,
    fixed_competitor_amount,
    cash_adjustment_amount,
    interest_percent,
    due_day,
    updated_at
  )
  values (
    p_fee->>'id',
    v_month,
    v_training_session_cost,
    v_sunday_cost,
    v_training_billing_base,
    v_sunday_billing_base,
    v_fixed_training_only_amount,
    v_fixed_competitor_amount,
    v_cash_adjustment_amount,
    v_interest_percent,
    v_due_day,
    now()
  )
  on conflict (id) do update
  set
    month = excluded.month,
    training_session_cost = excluded.training_session_cost,
    sunday_cost = excluded.sunday_cost,
    training_billing_base = excluded.training_billing_base,
    sunday_billing_base = excluded.sunday_billing_base,
    fixed_training_only_amount = excluded.fixed_training_only_amount,
    fixed_competitor_amount = excluded.fixed_competitor_amount,
    cash_adjustment_amount = excluded.cash_adjustment_amount,
    interest_percent = excluded.interest_percent,
    due_day = excluded.due_day,
    updated_at = now();
end;
$$;

drop function if exists public.admin_list_treasury_movements(text);

create or replace function public.admin_list_treasury_movements(p_admin_pin text)
returns table (
  id text,
  fee_id text,
  month text,
  movement_type text,
  category text,
  amount numeric,
  occurred_at date,
  description text,
  source text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  return query
  select
    m.id,
    m.fee_id,
    m.month,
    m.movement_type,
    m.category,
    m.amount,
    m.occurred_at,
    m.description,
    m.source,
    m.active,
    m.created_at,
    m.updated_at
  from public.treasury_movements m
  order by m.occurred_at desc, m.created_at desc;
end;
$$;

create or replace function public.admin_upsert_treasury_movement(
  p_admin_pin text,
  p_movement jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := p_movement->>'id';
  v_fee_id text := p_movement->>'fee_id';
  v_month text := p_movement->>'month';
  v_category text := coalesce(p_movement->>'category', 'otro');
  v_source text := coalesce(p_movement->>'source', 'manual');
  v_amount numeric := coalesce((p_movement->>'amount')::numeric, 0);
  v_occurred_at date := (p_movement->>'occurred_at')::date;
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if coalesce(v_id, '') = '' or coalesce(v_fee_id, '') = '' or coalesce(v_month, '') !~ '^\d{4}-\d{2}$' then
    raise exception 'Movimiento de caja invalido';
  end if;

  if v_category not in ('entrenamiento', 'domingo', 'seguro_documentacion', 'aporte_club', 'otro') then
    raise exception 'Concepto invalido';
  end if;

  if v_source not in ('manual', 'auto') then
    raise exception 'Origen invalido';
  end if;

  if v_amount <= 0 then
    raise exception 'Monto invalido';
  end if;

  insert into public.treasury_movements (
    id,
    fee_id,
    month,
    movement_type,
    category,
    amount,
    occurred_at,
    description,
    source,
    active,
    created_at,
    updated_at
  )
  values (
    v_id,
    v_fee_id,
    v_month,
    'egreso',
    v_category,
    v_amount,
    v_occurred_at,
    coalesce(p_movement->>'description', ''),
    v_source,
    coalesce((p_movement->>'active')::boolean, true),
    coalesce(nullif(p_movement->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (id) do update
  set
    fee_id = excluded.fee_id,
    month = excluded.month,
    movement_type = excluded.movement_type,
    category = excluded.category,
    amount = excluded.amount,
    occurred_at = excluded.occurred_at,
    description = excluded.description,
    source = excluded.source,
    active = excluded.active,
    updated_at = now();
end;
$$;

create or replace function public.admin_delete_treasury_movement(
  p_admin_pin text,
  p_movement_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  update public.treasury_movements
  set active = false, updated_at = now()
  where id = p_movement_id;
end;
$$;

grant execute on function public.admin_upsert_fee(text, jsonb) to anon, authenticated;
grant execute on function public.admin_list_treasury_movements(text) to anon, authenticated;
grant execute on function public.admin_upsert_treasury_movement(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_treasury_movement(text, text) to anon, authenticated;
