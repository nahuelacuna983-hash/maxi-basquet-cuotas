alter table public.players
add column if not exists billing_start_month text;

drop function if exists public.list_public_players();

create function public.list_public_players()
returns table (
  id text,
  first_name text,
  last_name text,
  phone text,
  type text,
  status text,
  internal_enabled boolean,
  responsibility_score integer,
  billing_start_month text,
  has_access_code boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.phone,
    p.type,
    p.status,
    p.internal_enabled,
    p.responsibility_score,
    p.billing_start_month,
    coalesce(p.access_code, '') <> '' as has_access_code
  from public.players p
  order by p.last_name, p.first_name;
$$;

drop function if exists public.admin_list_players(text);

create function public.admin_list_players(p_admin_pin text)
returns table (
  id text,
  first_name text,
  last_name text,
  phone text,
  type text,
  status text,
  internal_enabled boolean,
  responsibility_score integer,
  access_code text,
  billing_start_month text,
  has_access_code boolean
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
    p.id,
    p.first_name,
    p.last_name,
    p.phone,
    p.type,
    p.status,
    p.internal_enabled,
    p.responsibility_score,
    p.access_code,
    p.billing_start_month,
    coalesce(p.access_code, '') <> '' as has_access_code
  from public.players p
  order by p.last_name, p.first_name;
end;
$$;

create or replace function public.admin_upsert_player(
  p_admin_pin text,
  p_player jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_billing_start_month text := nullif(trim(coalesce(p_player->>'billing_start_month', '')), '');
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if coalesce(p_player->>'type', '') not in ('competidor', 'solo_entrenamientos') then
    raise exception 'Tipo de jugador invalido';
  end if;

  if coalesce(p_player->>'status', '') not in ('activo', 'lesionado', 'lista_espera', 'esporadico', 'baja') then
    raise exception 'Estado de jugador invalido';
  end if;

  if v_billing_start_month is not null and v_billing_start_month !~ '^\d{4}-\d{2}$' then
    raise exception 'Inicio de cobro invalido';
  end if;

  insert into public.players (
    id,
    first_name,
    last_name,
    phone,
    type,
    status,
    internal_enabled,
    responsibility_score,
    access_code,
    billing_start_month,
    updated_at
  )
  values (
    p_player->>'id',
    p_player->>'first_name',
    coalesce(p_player->>'last_name', ''),
    coalesce(p_player->>'phone', ''),
    p_player->>'type',
    p_player->>'status',
    coalesce((p_player->>'internal_enabled')::boolean, false),
    coalesce((p_player->>'responsibility_score')::integer, 0),
    coalesce(p_player->>'access_code', ''),
    v_billing_start_month,
    now()
  )
  on conflict (id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    type = excluded.type,
    status = excluded.status,
    internal_enabled = excluded.internal_enabled,
    responsibility_score = excluded.responsibility_score,
    access_code = excluded.access_code,
    billing_start_month = excluded.billing_start_month,
    updated_at = now();
end;
$$;

grant execute on function public.list_public_players() to anon, authenticated;
grant execute on function public.admin_list_players(text) to anon, authenticated;
grant execute on function public.admin_upsert_player(text, jsonb) to anon, authenticated;
