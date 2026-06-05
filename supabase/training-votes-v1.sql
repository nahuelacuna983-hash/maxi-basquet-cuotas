create table if not exists public.training_votes (
  id text primary key,
  date date not null,
  voter_player_id text not null references public.players(id) on delete cascade,
  featured_player_id text not null references public.players(id) on delete cascade,
  award text not null check (award in ('pelota', 'copa')),
  sponge_player_id text not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, voter_player_id),
  check (featured_player_id <> sponge_player_id)
);

alter table public.training_votes enable row level security;

drop policy if exists "mvp_training_votes_select" on public.training_votes;
drop policy if exists "mvp_training_votes_insert" on public.training_votes;
drop policy if exists "mvp_training_votes_update" on public.training_votes;
drop policy if exists "mvp_training_votes_delete" on public.training_votes;

create policy "mvp_training_votes_select"
on public.training_votes
for select
using (true);

create or replace function public.submit_training_vote(
  p_player_id text,
  p_access_code text,
  p_vote jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_open_at timestamptz;
  v_close_at timestamptz;
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

  if p_vote->>'voter_player_id' <> p_player_id then
    raise exception 'Jugador votante invalido';
  end if;

  v_date := (p_vote->>'date')::date;
  v_open_at := (v_date + time '22:01') at time zone 'America/Buenos_Aires';
  v_close_at := (v_date + 1 + time '23:59') at time zone 'America/Buenos_Aires';

  if now() < v_open_at or now() > v_close_at then
    raise exception 'La votacion no esta abierta para esta fecha';
  end if;

  if p_vote->>'award' not in ('pelota', 'copa') then
    raise exception 'Premio invalido';
  end if;

  if p_vote->>'featured_player_id' = p_vote->>'sponge_player_id' then
    raise exception 'Destacado y esponja tienen que ser distintos';
  end if;

  if not exists (
    select 1
    from public.attendances
    where date = v_date
      and coalesce(event_type, 'entrenamiento') = 'entrenamiento'
      and player_id = p_player_id
      and status in ('voy', 'avisa_mas_tarde', 'llega_sobre_la_hora', 'asistio')
  ) then
    raise exception 'Solo pueden votar quienes participaron del entrenamiento';
  end if;

  if not exists (
    select 1
    from public.attendances
    where date = v_date
      and coalesce(event_type, 'entrenamiento') = 'entrenamiento'
      and player_id = p_vote->>'featured_player_id'
      and status in ('voy', 'avisa_mas_tarde', 'llega_sobre_la_hora', 'asistio')
  ) then
    raise exception 'El destacado elegido no esta en el listado de participantes';
  end if;

  if not exists (
    select 1
    from public.attendances
    where date = v_date
      and coalesce(event_type, 'entrenamiento') = 'entrenamiento'
      and player_id = p_vote->>'sponge_player_id'
      and status in ('voy', 'avisa_mas_tarde', 'llega_sobre_la_hora', 'asistio')
  ) then
    raise exception 'El esponja elegido no esta en el listado de participantes';
  end if;

  insert into public.training_votes (
    id,
    date,
    voter_player_id,
    featured_player_id,
    award,
    sponge_player_id,
    created_at,
    updated_at
  )
  values (
    p_vote->>'id',
    v_date,
    p_player_id,
    p_vote->>'featured_player_id',
    p_vote->>'award',
    p_vote->>'sponge_player_id',
    coalesce(nullif(p_vote->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (date, voter_player_id) do update
  set
    featured_player_id = excluded.featured_player_id,
    award = excluded.award,
    sponge_player_id = excluded.sponge_player_id,
    updated_at = now();
end;
$$;

grant execute on function public.submit_training_vote(text, text, jsonb) to anon, authenticated;
