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
  v_expected_code text;
  v_source text;
begin
  select access_code into v_expected_code
  from public.players
  where id = p_player_id
    and status = 'activo';

  if v_expected_code is null or v_expected_code = '' or v_expected_code <> p_access_code then
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

grant execute on function public.submit_training_attendance(text, text, jsonb) to anon, authenticated;
