create or replace function public.list_public_player_clearance()
returns table (
  player_id text,
  player_name text,
  clearance_status text
)
language sql
stable
security definer
set search_path = ''
as $function$
  with required_documents(document_type) as (
    values
      ('estudios_medicos'::text),
      ('djdr'::text),
      ('pase'::text)
  ),
  player_requirements as (
    select
      p.id,
      trim(concat_ws(
        ' ',
        nullif(trim(coalesce(p.last_name, '')), ''),
        nullif(trim(coalesce(p.first_name, '')), '')
      )) as player_name,
      bool_and(
        coalesce(
          latest.status = 'cargado'
          and (latest.expires_at is null or latest.expires_at >= current_date),
          false
        )
      ) as all_requirements_current
    from public.players as p
    cross join required_documents as required
    left join lateral (
      select d.status, d.expires_at
      from public.player_documents as d
      where d.player_id = p.id
        and d.document_type = required.document_type
      order by
        coalesce(d.expires_at, d.updated_at::date, d.created_at::date) desc nulls last,
        d.updated_at desc nulls last,
        d.created_at desc nulls last
      limit 1
    ) as latest on true
    where p.status = 'activo'
      and p.type = 'competidor'
    group by p.id, p.last_name, p.first_name
  )
  select
    requirements.id::text,
    coalesce(nullif(requirements.player_name, ''), 'Jugador'),
    case
      when requirements.all_requirements_current then 'habilitado'
      else 'inhabilitado'
    end
  from player_requirements as requirements
  order by lower(requirements.player_name), requirements.id;
$function$;

revoke all on function public.list_public_player_clearance() from public;
grant execute on function public.list_public_player_clearance() to anon, authenticated;
