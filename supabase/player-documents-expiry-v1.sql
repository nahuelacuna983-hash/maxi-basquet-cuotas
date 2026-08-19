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
