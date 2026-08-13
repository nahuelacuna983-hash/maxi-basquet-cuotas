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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_type, drive_file_id)
);

alter table public.player_documents enable row level security;

drop policy if exists "mvp_player_documents_select" on public.player_documents;
drop policy if exists "mvp_player_documents_write" on public.player_documents;

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
    d.created_at,
    d.updated_at
  from public.player_documents d
  left join public.players p on p.id = d.player_id
  order by player_name, d.document_type, d.title;
end;
$$;

grant execute on function public.admin_list_player_documents(text) to anon, authenticated;
