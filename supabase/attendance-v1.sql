create table if not exists public.attendances (
  id text primary key,
  date date not null,
  event_type text not null default 'entrenamiento',
  player_id text not null references public.players(id) on delete cascade,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, player_id, event_type)
);

alter table public.attendances enable row level security;

drop policy if exists "mvp_attendances_select" on public.attendances;
drop policy if exists "mvp_attendances_write" on public.attendances;

create policy "mvp_attendances_select"
on public.attendances
for select
using (true);

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
    'jugador',
    coalesce(nullif(p_attendance->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (date, player_id, event_type) do update
  set
    status = excluded.status,
    source = 'jugador',
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
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
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
    p_attendance->>'player_id',
    p_attendance->>'status',
    coalesce(p_attendance->>'source', 'admin'),
    coalesce(nullif(p_attendance->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (date, player_id, event_type) do update
  set
    status = excluded.status,
    source = excluded.source,
    updated_at = now();
end;
$$;

grant execute on function public.submit_training_attendance(text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_upsert_attendance(text, jsonb) to anon, authenticated;
