alter table public.player_documents
add column if not exists expires_at date;

drop function if exists public.admin_list_player_documents(text);

create function public.admin_list_player_documents(p_admin_pin text)
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

drop function if exists public.list_player_documents_for_player(text, text);

create function public.list_player_documents_for_player(
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

grant execute on function public.admin_list_player_documents(text) to anon, authenticated;
grant execute on function public.list_player_documents_for_player(text, text) to anon, authenticated;

drop function if exists public.admin_upsert_player_document_requirement(text, jsonb);

create function public.admin_upsert_player_document_requirement(
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
