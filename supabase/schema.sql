create table if not exists public.players (
  id text primary key,
  first_name text not null,
  last_name text default '',
  phone text default '',
  birth_date date,
  type text not null check (type in ('competidor', 'solo_entrenamientos')),
  status text not null check (status in ('activo', 'lesionado', 'lista_espera', 'esporadico', 'baja')),
  internal_enabled boolean not null default false,
  responsibility_score integer not null default 0,
  access_code text default '',
  billing_start_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players
add column if not exists access_code text default '';

alter table public.players
add column if not exists billing_start_month text;

alter table public.players
add column if not exists birth_date date;

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

create table if not exists public.fee_adjustments (
  id text primary key,
  player_id text not null references public.players(id) on delete cascade,
  fee_id text not null references public.fees(id) on delete cascade,
  adjustment_type text not null default 'monto_final' check (
    adjustment_type in ('monto_final')
  ),
  final_amount numeric not null check (final_amount >= 0),
  reason text not null default 'otro' check (
    reason in ('viaje', 'lesion', 'permiso', 'ingreso_tarde', 'otro')
  ),
  observation text default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fee_adjustments_active_player_fee_unique
on public.fee_adjustments (player_id, fee_id)
where active = true;

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

create table if not exists public.player_documents (
  id text primary key,
  player_id text references public.players(id) on delete set null,
  player_name text default '',
  document_type text not null check (
    document_type in (
      'estudios_medicos',
      'djdr',
      'pase',
      'seguro',
      'lista_buena_fe'
    )
  ),
  title text not null,
  drive_file_id text default '',
  drive_url text not null,
  mime_type text default '',
  status text not null default 'cargado' check (
    status in ('cargado', 'pendiente', 'revisar', 'vencido')
  ),
  observation text default '',
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_type, drive_file_id)
);

alter table public.players enable row level security;
alter table public.fees enable row level security;
alter table public.payments enable row level security;
alter table public.fee_adjustments enable row level security;
alter table public.attendances enable row level security;
alter table public.treasury_config enable row level security;
alter table public.player_documents enable row level security;

drop policy if exists "mvp_players_select" on public.players;
drop policy if exists "mvp_players_write" on public.players;
drop policy if exists "mvp_fees_select" on public.fees;
drop policy if exists "mvp_fees_write" on public.fees;
drop policy if exists "mvp_payments_select" on public.payments;
drop policy if exists "mvp_payments_write" on public.payments;
drop policy if exists "fee_adjustments_select_active" on public.fee_adjustments;
drop policy if exists "mvp_attendances_select" on public.attendances;
drop policy if exists "mvp_attendances_write" on public.attendances;
drop policy if exists "mvp_treasury_select" on public.treasury_config;
drop policy if exists "mvp_treasury_write" on public.treasury_config;
drop policy if exists "mvp_player_documents_select" on public.player_documents;
drop policy if exists "mvp_player_documents_write" on public.player_documents;

create policy "mvp_players_select" on public.players for select using (true);
create policy "mvp_players_write" on public.players for all using (true) with check (true);

create policy "mvp_fees_select" on public.fees for select using (true);
create policy "mvp_fees_write" on public.fees for all using (true) with check (true);

create policy "mvp_payments_select" on public.payments for select using (true);
create policy "mvp_payments_write" on public.payments for all using (true) with check (true);

create policy "fee_adjustments_select_active" on public.fee_adjustments for select using (active = true);

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

create or replace function public.admin_delete_guest_attendance(
  p_admin_pin text,
  p_attendance_id text,
  p_attendance_date date,
  p_guest_name text
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

  delete from public.attendances
  where participant_type = 'guest'
    and (
      id = p_attendance_id
      or (
        date = p_attendance_date
        and event_type = 'entrenamiento'
        and lower(trim(guest_name)) = lower(trim(p_guest_name))
      )
    );
end;
$$;

grant execute on function public.submit_training_attendance(text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_upsert_attendance(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_guest_attendance(text, text, date, text) to anon, authenticated;

drop function if exists public.admin_list_player_documents(text);

create or replace function public.admin_list_player_documents(p_admin_pin text)
returns table (
  id text,
  player_id text,
  player_name text,
  document_type text,
  title text,
  drive_file_id text,
  drive_url text,
  mime_type text,
  status text,
  observation text,
  expires_at date,
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
    d.id,
    d.player_id,
    coalesce(
      nullif(trim(coalesce(p.last_name, '') || ' ' || coalesce(p.first_name, '')), ''),
      nullif(trim(d.player_name), ''),
      'Sin asociar'
    ) as player_name,
    d.document_type,
    d.title,
    d.drive_file_id,
    d.drive_url,
    d.mime_type,
    d.status,
    d.observation,
    d.expires_at,
    d.created_at,
    d.updated_at
  from public.player_documents d
  left join public.players p on p.id = d.player_id
  order by player_name, d.document_type, d.title;
end;
$$;

grant execute on function public.admin_list_player_documents(text) to anon, authenticated;

drop function if exists public.list_player_documents_for_player(text, text);

create or replace function public.list_player_documents_for_player(
  p_player_id text,
  p_access_code text
)
returns table (
  id text,
  player_id text,
  player_name text,
  document_type text,
  title text,
  drive_file_id text,
  drive_url text,
  mime_type text,
  status text,
  observation text,
  expires_at date,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.players p
    where p.id = p_player_id
      and nullif(trim(coalesce(p.access_code, '')), '') is not null
      and p.access_code = p_access_code
  ) then
    raise exception 'Codigo de jugador invalido';
  end if;

  return query
  select
    d.id,
    d.player_id,
    coalesce(
      nullif(trim(coalesce(p.last_name, '') || ' ' || coalesce(p.first_name, '')), ''),
      nullif(trim(d.player_name), ''),
      'Jugador'
    ) as player_name,
    d.document_type,
    d.title,
    ''::text as drive_file_id,
    ''::text as drive_url,
    d.mime_type,
    d.status,
    d.observation,
    d.expires_at,
    d.created_at,
    d.updated_at
  from public.player_documents d
  join public.players p on p.id = d.player_id
  where d.player_id = p_player_id
  order by d.document_type, d.title;
end;
$$;

grant execute on function public.list_player_documents_for_player(text, text) to anon, authenticated;

drop function if exists public.admin_upsert_player_document_requirement(text, jsonb);

create or replace function public.admin_upsert_player_document_requirement(
  p_admin_pin text,
  p_requirement jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := p_requirement->>'player_id';
  v_document_type text := p_requirement->>'document_type';
  v_status text := coalesce(nullif(p_requirement->>'status', ''), 'pendiente');
  v_expires_at date := nullif(p_requirement->>'expires_at', '')::date;
  v_observation text := coalesce(p_requirement->>'observation', '');
  v_id text := coalesce(nullif(p_requirement->>'id', ''), 'requirement-' || v_player_id || '-' || v_document_type);
  v_title text;
  v_player_name text;
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if v_document_type not in ('estudios_medicos', 'djdr', 'pase', 'seguro', 'lista_buena_fe') then
    raise exception 'Requisito invalido';
  end if;

  if v_status not in ('cargado', 'pendiente', 'revisar', 'vencido') then
    raise exception 'Estado invalido';
  end if;

  select
    coalesce(nullif(trim(coalesce(last_name, '') || ' ' || coalesce(first_name, '')), ''), 'Jugador')
  into v_player_name
  from public.players
  where id = v_player_id;

  if v_player_name is null then
    raise exception 'Jugador invalido';
  end if;

  v_title := case v_document_type
    when 'estudios_medicos' then 'Estudios medicos'
    when 'djdr' then 'DJDR'
    when 'pase' then 'Pase'
    when 'seguro' then 'Seguro'
    when 'lista_buena_fe' then 'Lista buena fe'
    else 'Requisito'
  end;

  insert into public.player_documents (
    id,
    player_id,
    player_name,
    document_type,
    title,
    drive_file_id,
    drive_url,
    mime_type,
    status,
    observation,
    expires_at,
    created_at,
    updated_at
  )
  values (
    v_id,
    v_player_id,
    v_player_name,
    v_document_type,
    v_title,
    'requirement:' || v_player_id || ':' || v_document_type,
    '',
    'requirement',
    v_status,
    v_observation,
    v_expires_at,
    now(),
    now()
  )
  on conflict (id) do update
  set
    player_id = excluded.player_id,
    player_name = excluded.player_name,
    document_type = excluded.document_type,
    title = excluded.title,
    drive_file_id = excluded.drive_file_id,
    drive_url = excluded.drive_url,
    mime_type = excluded.mime_type,
    status = excluded.status,
    observation = excluded.observation,
    expires_at = excluded.expires_at,
    updated_at = now();
end;
$$;

grant execute on function public.admin_upsert_player_document_requirement(text, jsonb) to anon, authenticated;

create or replace function public.admin_upsert_fee_adjustment(
  p_admin_pin text,
  p_adjustment jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := p_adjustment->>'id';
  v_player_id text := p_adjustment->>'player_id';
  v_fee_id text := p_adjustment->>'fee_id';
  v_adjustment_type text := coalesce(p_adjustment->>'adjustment_type', 'monto_final');
  v_final_amount numeric := coalesce((p_adjustment->>'final_amount')::numeric, 0);
  v_reason text := coalesce(p_adjustment->>'reason', 'otro');
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if coalesce(v_id, '') = '' or coalesce(v_player_id, '') = '' or coalesce(v_fee_id, '') = '' then
    raise exception 'Ajuste invalido';
  end if;

  if v_adjustment_type <> 'monto_final' then
    raise exception 'Tipo de ajuste invalido';
  end if;

  if v_final_amount < 0 then
    raise exception 'Monto final invalido';
  end if;

  if v_reason not in ('viaje', 'lesion', 'permiso', 'ingreso_tarde', 'otro') then
    raise exception 'Motivo invalido';
  end if;

  update public.fee_adjustments
  set active = false, updated_at = now()
  where player_id = v_player_id
    and fee_id = v_fee_id
    and id <> v_id
    and active = true;

  insert into public.fee_adjustments (
    id,
    player_id,
    fee_id,
    adjustment_type,
    final_amount,
    reason,
    observation,
    active,
    created_at,
    updated_at
  ) values (
    v_id,
    v_player_id,
    v_fee_id,
    v_adjustment_type,
    v_final_amount,
    v_reason,
    coalesce(p_adjustment->>'observation', ''),
    coalesce((p_adjustment->>'active')::boolean, true),
    coalesce(nullif(p_adjustment->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (id) do update set
    player_id = excluded.player_id,
    fee_id = excluded.fee_id,
    adjustment_type = excluded.adjustment_type,
    final_amount = excluded.final_amount,
    reason = excluded.reason,
    observation = excluded.observation,
    active = excluded.active,
    updated_at = now();
end;
$$;

create or replace function public.admin_delete_fee_adjustment(
  p_admin_pin text,
  p_adjustment_id text
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

  update public.fee_adjustments
  set active = false, updated_at = now()
  where id = p_adjustment_id;
end;
$$;

grant select on public.fee_adjustments to anon, authenticated;
grant execute on function public.admin_upsert_fee_adjustment(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_fee_adjustment(text, text) to anon, authenticated;
