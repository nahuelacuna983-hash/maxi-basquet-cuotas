create table if not exists public.players (
  id text primary key,
  first_name text not null,
  last_name text default '',
  phone text default '',
  type text not null check (type in ('competidor', 'solo_entrenamientos')),
  status text not null check (status in ('activo', 'lesionado', 'lista_espera', 'esporadico', 'baja')),
  internal_enabled boolean not null default false,
  responsibility_score integer not null default 0,
  access_code text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players
add column if not exists access_code text default '';

create table if not exists public.fees (
  id text primary key,
  month text not null unique,
  training_session_cost numeric not null default 55000,
  sunday_cost numeric not null default 90000,
  training_billing_base numeric,
  sunday_billing_base numeric,
  fixed_training_only_amount numeric,
  fixed_competitor_amount numeric,
  interest_percent numeric not null default 5,
  due_day integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fees
add column if not exists fixed_training_only_amount numeric;

alter table public.fees
add column if not exists fixed_competitor_amount numeric;

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
  reviewed_by text,
  deleted_at timestamptz
);

alter table public.payments
add column if not exists deleted_at timestamptz;

create table if not exists public.attendances (
  id text primary key,
  date date not null,
  event_type text not null default 'entrenamiento',
  player_id text references public.players(id) on delete cascade,
  status text not null check (
    status in (
      'voy',
      'no_voy',
      'avisa_mas_tarde',
      'llega_sobre_la_hora',
      'baja_sobre_la_hora',
      'anotado',
      'asistio',
      'falto',
      'aviso_tarde'
    )
  ),
  source text not null default 'jugador',
  participant_type text not null default 'player',
  guest_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, player_id, event_type),
  constraint attendances_participant_valid check (
    (
      participant_type = 'player'
      and player_id is not null
      and coalesce(guest_name, '') = ''
    )
    or
    (
      participant_type = 'guest'
      and player_id is null
      and coalesce(guest_name, '') <> ''
    )
  )
);

create unique index if not exists attendances_guest_unique
on public.attendances (date, event_type, guest_name)
where participant_type = 'guest';

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
alter table public.attendances enable row level security;
alter table public.treasury_config enable row level security;

drop policy if exists "mvp_players_select" on public.players;
drop policy if exists "mvp_players_write" on public.players;
drop policy if exists "mvp_fees_select" on public.fees;
drop policy if exists "mvp_fees_write" on public.fees;
drop policy if exists "mvp_payments_select" on public.payments;
drop policy if exists "mvp_payments_write" on public.payments;
drop policy if exists "mvp_attendances_select" on public.attendances;
drop policy if exists "mvp_attendances_write" on public.attendances;
drop policy if exists "mvp_treasury_select" on public.treasury_config;
drop policy if exists "mvp_treasury_write" on public.treasury_config;

create policy "mvp_players_select" on public.players for select using (true);
create policy "mvp_players_write" on public.players for all using (true) with check (true);

create policy "mvp_fees_select" on public.fees for select using (true);
create policy "mvp_fees_write" on public.fees for all using (true) with check (true);

create policy "mvp_payments_select" on public.payments for select using (true);
create policy "mvp_payments_write" on public.payments for all using (true) with check (true);

create policy "mvp_attendances_select" on public.attendances for select using (true);

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

create or replace function public.submit_training_attendance(
  p_player_id text,
  p_access_code text,
  p_attendance jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
begin
  if not exists (
    select 1
    from public.players
    where id = p_player_id
      and access_code = p_access_code
      and coalesce(access_code, '') <> ''
  ) then
    raise exception 'Codigo de jugador invalido';
  end if;

  if p_attendance->>'player_id' <> p_player_id then
    raise exception 'Jugador invalido';
  end if;

  if p_attendance->>'status' not in (
    'voy',
    'no_voy',
    'avisa_mas_tarde',
    'llega_sobre_la_hora',
    'baja_sobre_la_hora'
  ) then
    raise exception 'Estado de asistencia invalido';
  end if;

  v_source := coalesce(p_attendance->>'source', 'jugador');
  if v_source <> 'jugador' and v_source not like 'jugador|tags=%' then
    v_source := 'jugador';
  end if;

  insert into public.attendances (
    id,
    date,
    event_type,
    player_id,
    status,
    source,
    created_at,
    updated_at
  )
  values (
    p_attendance->>'id',
    (p_attendance->>'date')::date,
    coalesce(p_attendance->>'event_type', 'entrenamiento'),
    p_player_id,
    p_attendance->>'status',
    v_source,
    coalesce(nullif(p_attendance->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (date, player_id, event_type) do update
  set
    status = excluded.status,
    source = v_source,
    updated_at = now();
end;
$$;

create or replace function public.admin_upsert_attendance(
  p_admin_pin text,
  p_attendance jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_type text := coalesce(p_attendance->>'participant_type', 'player');
  v_guest_name text := nullif(trim(coalesce(p_attendance->>'guest_name', '')), '');
  v_player_id text := nullif(p_attendance->>'player_id', '');
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if v_participant_type not in ('player', 'guest') then
    raise exception 'Tipo de participante invalido';
  end if;

  if v_participant_type = 'guest' then
    if v_guest_name is null then
      raise exception 'Nombre de invitado requerido';
    end if;

    insert into public.attendances (
      id,
      date,
      event_type,
      player_id,
      status,
      source,
      participant_type,
      guest_name,
      created_at,
      updated_at
    )
    values (
      p_attendance->>'id',
      (p_attendance->>'date')::date,
      coalesce(p_attendance->>'event_type', 'entrenamiento'),
      null,
      p_attendance->>'status',
      coalesce(p_attendance->>'source', 'admin'),
      'guest',
      v_guest_name,
      coalesce(nullif(p_attendance->>'created_at', '')::timestamptz, now()),
      now()
    )
    on conflict (date, event_type, guest_name) where participant_type = 'guest' do update
    set
      status = excluded.status,
      source = excluded.source,
      updated_at = now();

    return;
  end if;

  if v_player_id is null then
    raise exception 'Jugador requerido';
  end if;

  insert into public.attendances (
    id,
    date,
    event_type,
    player_id,
    status,
    source,
    participant_type,
    guest_name,
    created_at,
    updated_at
  )
  values (
    p_attendance->>'id',
    (p_attendance->>'date')::date,
    coalesce(p_attendance->>'event_type', 'entrenamiento'),
    v_player_id,
    p_attendance->>'status',
    coalesce(p_attendance->>'source', 'admin'),
    'player',
    null,
    coalesce(nullif(p_attendance->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (date, player_id, event_type) do update
  set
    status = excluded.status,
    source = excluded.source,
    participant_type = 'player',
    guest_name = null,
    updated_at = now();
end;
$$;

grant execute on function public.submit_training_attendance(text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_upsert_attendance(text, jsonb) to anon, authenticated;
