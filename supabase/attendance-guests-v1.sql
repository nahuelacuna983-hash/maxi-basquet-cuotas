alter table public.attendances
add column if not exists participant_type text not null default 'player';

alter table public.attendances
add column if not exists guest_name text;

alter table public.attendances
alter column player_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendances_participant_valid'
      and conrelid = 'public.attendances'::regclass
  ) then
    alter table public.attendances
    add constraint attendances_participant_valid
    check (
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
    );
  end if;
end $$;

create unique index if not exists attendances_guest_unique
on public.attendances (date, event_type, guest_name)
where participant_type = 'guest';

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

grant execute on function public.admin_upsert_attendance(text, jsonb) to anon, authenticated;
