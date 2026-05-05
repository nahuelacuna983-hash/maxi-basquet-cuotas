create table if not exists public.players (
  id text primary key,
  first_name text not null,
  last_name text default '',
  phone text default '',
  type text not null check (type in ('competidor', 'solo_entrenamientos')),
  status text not null check (status in ('activo', 'lesionado', 'lista_espera', 'esporadico', 'baja')),
  internal_enabled boolean not null default false,
  responsibility_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fees (
  id text primary key,
  month text not null unique,
  training_session_cost numeric not null default 55000,
  sunday_cost numeric not null default 90000,
  training_billing_base numeric,
  sunday_billing_base numeric,
  interest_percent numeric not null default 5,
  due_day integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id text primary key,
  player_id text not null references public.players(id) on delete cascade,
  fee_id text not null references public.fees(id) on delete cascade,
  amount numeric not null,
  paid_at date not null,
  method text not null check (method in ('transferencia', 'efectivo')),
  status text not null check (status in ('pendiente', 'aprobado', 'rechazado')),
  operation_number text default '',
  receipt_note text default '',
  note text default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create table if not exists public.treasury_config (
  id text primary key default 'main',
  payment_alias text default '',
  account_holder text default '',
  payment_link text default '',
  payment_test_mode boolean not null default true,
  payment_instructions text default '',
  updated_at timestamptz not null default now(),
  constraint treasury_config_singleton check (id = 'main')
);

alter table public.players enable row level security;
alter table public.fees enable row level security;
alter table public.payments enable row level security;
alter table public.treasury_config enable row level security;

drop policy if exists "mvp_players_select" on public.players;
drop policy if exists "mvp_players_write" on public.players;
drop policy if exists "mvp_fees_select" on public.fees;
drop policy if exists "mvp_fees_write" on public.fees;
drop policy if exists "mvp_payments_select" on public.payments;
drop policy if exists "mvp_payments_write" on public.payments;
drop policy if exists "mvp_treasury_select" on public.treasury_config;
drop policy if exists "mvp_treasury_write" on public.treasury_config;

create policy "mvp_players_select" on public.players for select using (true);
create policy "mvp_players_write" on public.players for all using (true) with check (true);

create policy "mvp_fees_select" on public.fees for select using (true);
create policy "mvp_fees_write" on public.fees for all using (true) with check (true);

create policy "mvp_payments_select" on public.payments for select using (true);
create policy "mvp_payments_write" on public.payments for all using (true) with check (true);

create policy "mvp_treasury_select" on public.treasury_config for select using (true);
create policy "mvp_treasury_write" on public.treasury_config for all using (true) with check (true);

insert into public.treasury_config (
  id,
  payment_alias,
  account_holder,
  payment_link,
  payment_test_mode,
  payment_instructions
) values (
  'main',
  'maxibasquet.alias',
  'Tesoreria Maxi Basquet',
  'https://link.mercadopago.com.ar/mi-alias',
  true,
  'Transferi la cuota al alias, informa el pago y espera la validacion del administrador.'
) on conflict (id) do nothing;
