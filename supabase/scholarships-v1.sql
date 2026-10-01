alter table public.fee_adjustments
drop constraint if exists fee_adjustments_reason_check;

alter table public.fee_adjustments
add constraint fee_adjustments_reason_check
check (reason in ('viaje', 'lesion', 'permiso', 'ingreso_tarde', 'beca', 'otro'));

create table if not exists public.scholarship_offers (
  id text primary key,
  fee_id text not null references public.fees(id) on delete cascade,
  month text not null,
  player_id text not null references public.players(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'no_response', 'cancelled')
  ),
  response_deadline timestamptz,
  explanation_seen boolean not null default false,
  note text default '',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scholarship_offers
alter column response_deadline type timestamptz
using response_deadline::timestamptz;

alter table public.scholarship_offers enable row level security;

drop policy if exists "scholarship_offers_no_direct_select" on public.scholarship_offers;
drop policy if exists "scholarship_offers_no_direct_insert" on public.scholarship_offers;
drop policy if exists "scholarship_offers_no_direct_update" on public.scholarship_offers;
drop policy if exists "scholarship_offers_no_direct_delete" on public.scholarship_offers;

create or replace function public.refresh_scholarship_offers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee record;
  v_latest_status text;
  v_candidate_id text;
  v_candidate_month text;
begin
  update public.scholarship_offers
  set
    status = 'no_response',
    explanation_seen = true,
    responded_at = now(),
    updated_at = now()
  where status = 'pending'
    and response_deadline is not null
    and response_deadline < now();

  for v_fee in
    select distinct fee_id
    from public.scholarship_offers
  loop
    if exists (
      select 1
      from public.scholarship_offers
      where fee_id = v_fee.fee_id
        and status = 'pending'
    ) then
      continue;
    end if;

    if exists (
      select 1
      from public.scholarship_offers
      where fee_id = v_fee.fee_id
        and status = 'accepted'
    ) then
      continue;
    end if;

    select status into v_latest_status
    from public.scholarship_offers
    where fee_id = v_fee.fee_id
    order by created_at desc
    limit 1;

    if v_latest_status not in ('declined', 'no_response') then
      continue;
    end if;

    v_candidate_id := null;
    v_candidate_month := null;

    with eligible as (
      select
        p.id,
        f.month,
        row_number() over (
          order by lower(coalesce(p.last_name, '')), lower(coalesce(p.first_name, '')), p.id
        ) as rn
      from public.players p
      join public.fees f on f.id = v_fee.fee_id
      where p.status = 'activo'
        and p.type = 'competidor'
        and coalesce(p.internal_enabled, false) = true
        and lower(coalesce(p.last_name, '')) not in ('acuna', 'acuña', 'arevalo', 'arévalo')
        and coalesce(f.fixed_competitor_amount, f.training_session_cost, 0) > 0
        and not exists (
          select 1
          from public.fee_adjustments a
          where a.player_id = p.id
            and a.fee_id = f.id
            and a.active = true
            and a.final_amount = 0
        )
    ),
    latest as (
      select e.rn
      from public.scholarship_offers s
      join eligible e on e.id = s.player_id
      where s.fee_id = v_fee.fee_id
      order by s.created_at desc
      limit 1
    ),
    candidate as (
      select e.id, e.month
      from eligible e
      where not exists (
        select 1
        from public.scholarship_offers s
        where s.fee_id = v_fee.fee_id
          and s.player_id = e.id
          and s.status <> 'cancelled'
      )
      order by
        case
          when e.rn > coalesce((select rn from latest), 0) then e.rn
          else e.rn + 100000
        end
      limit 1
    )
    select id, month into v_candidate_id, v_candidate_month
    from candidate;

    if v_candidate_id is not null then
      insert into public.scholarship_offers (
        id,
        fee_id,
        month,
        player_id,
        status,
        response_deadline,
        explanation_seen,
        note,
        created_at,
        updated_at
      ) values (
        'scholarship-' || replace(extract(epoch from clock_timestamp())::text, '.', '') || '-' || substr(md5(random()::text), 1, 8),
        v_fee.fee_id,
        v_candidate_month,
        v_candidate_id,
        'pending',
        now() + interval '48 hours',
        false,
        'Beca solidaria mensual',
        now(),
        now()
      );
    end if;
  end loop;
end;
$$;

create or replace function public.admin_list_scholarship_offers(p_admin_pin text)
returns table (
  id text,
  fee_id text,
  month text,
  player_id text,
  status text,
  response_deadline timestamptz,
  explanation_seen boolean,
  note text,
  responded_at timestamptz,
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

  perform public.refresh_scholarship_offers();

  return query
  select
    s.id,
    s.fee_id,
    s.month,
    s.player_id,
    s.status,
    s.response_deadline,
    s.explanation_seen,
    s.note,
    s.responded_at,
    s.created_at,
    s.updated_at
  from public.scholarship_offers s
  order by s.created_at desc;
end;
$$;

create or replace function public.list_player_scholarship_offers(
  p_player_id text,
  p_access_code text
)
returns table (
  id text,
  fee_id text,
  month text,
  player_id text,
  status text,
  response_deadline timestamptz,
  explanation_seen boolean,
  note text,
  responded_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_code text;
begin
  select access_code into v_expected_code
  from public.players
  where id = p_player_id;

  if v_expected_code is null or v_expected_code = '' or v_expected_code <> p_access_code then
    raise exception 'Codigo de jugador invalido';
  end if;

  perform public.refresh_scholarship_offers();

  return query
  select
    s.id,
    s.fee_id,
    s.month,
    s.player_id,
    s.status,
    s.response_deadline,
    s.explanation_seen,
    s.note,
    s.responded_at,
    s.created_at,
    s.updated_at
  from public.scholarship_offers s
  where s.player_id = p_player_id
  order by s.created_at desc;
end;
$$;

create or replace function public.admin_upsert_scholarship_offer(
  p_admin_pin text,
  p_offer jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := p_offer->>'id';
  v_fee_id text := p_offer->>'fee_id';
  v_player_id text := p_offer->>'player_id';
  v_status text := coalesce(p_offer->>'status', 'pending');
  v_month text := nullif(p_offer->>'month', '');
  v_response_deadline timestamptz := nullif(p_offer->>'response_deadline', '')::timestamptz;
  v_fee_month text;
  v_player record;
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  perform public.refresh_scholarship_offers();

  if coalesce(v_id, '') = '' or coalesce(v_fee_id, '') = '' or coalesce(v_player_id, '') = '' then
    raise exception 'Beca invalida';
  end if;

  if v_status not in ('pending', 'accepted', 'declined', 'no_response', 'cancelled') then
    raise exception 'Estado de beca invalido';
  end if;

  select month into v_fee_month
  from public.fees
  where id = v_fee_id;

  if v_fee_month is null then
    raise exception 'Cuota inexistente';
  end if;

  select * into v_player
  from public.players
  where id = v_player_id;

  if v_player.id is null then
    raise exception 'Jugador inexistente';
  end if;

  if v_player.status <> 'activo' or v_player.type <> 'competidor' then
    raise exception 'La beca solo aplica a jugadores activos de cuota completa';
  end if;

  if lower(coalesce(v_player.last_name, '')) in ('acuna', 'acuña', 'arevalo', 'arévalo') then
    raise exception 'Jugador excluido de becas';
  end if;

  if v_status = 'pending' and exists (
    select 1
    from public.scholarship_offers
    where fee_id = v_fee_id
      and id <> v_id
      and status = 'pending'
  ) then
    raise exception 'Ya hay una beca pendiente para esta cuota';
  end if;

  insert into public.scholarship_offers (
    id,
    fee_id,
    month,
    player_id,
    status,
    response_deadline,
    explanation_seen,
    note,
    responded_at,
    created_at,
    updated_at
  ) values (
    v_id,
    v_fee_id,
    coalesce(v_month, v_fee_month),
    v_player_id,
    v_status,
    coalesce(v_response_deadline, now() + interval '48 hours'),
    coalesce((p_offer->>'explanation_seen')::boolean, false),
    coalesce(p_offer->>'note', ''),
    nullif(p_offer->>'responded_at', '')::timestamptz,
    coalesce(nullif(p_offer->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (id) do update set
    fee_id = excluded.fee_id,
    month = excluded.month,
    player_id = excluded.player_id,
    status = excluded.status,
    response_deadline = excluded.response_deadline,
    explanation_seen = excluded.explanation_seen,
    note = excluded.note,
    responded_at = excluded.responded_at,
    updated_at = now();

  perform public.refresh_scholarship_offers();
end;
$$;

create or replace function public.respond_scholarship_offer(
  p_player_id text,
  p_access_code text,
  p_offer_id text,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_code text;
  v_offer public.scholarship_offers%rowtype;
  v_adjustment_id text;
begin
  select access_code into v_expected_code
  from public.players
  where id = p_player_id;

  if v_expected_code is null or v_expected_code = '' or v_expected_code <> p_access_code then
    raise exception 'Codigo de jugador invalido';
  end if;

  if p_response not in ('accepted', 'declined') then
    raise exception 'Respuesta de beca invalida';
  end if;

  perform public.refresh_scholarship_offers();

  select * into v_offer
  from public.scholarship_offers
  where id = p_offer_id
    and player_id = p_player_id
    and status = 'pending';

  if v_offer.id is null then
    raise exception 'Beca pendiente inexistente o vencida';
  end if;

  if v_offer.response_deadline is not null and v_offer.response_deadline < now() then
    perform public.refresh_scholarship_offers();
    raise exception 'Beca vencida';
  end if;

  update public.scholarship_offers
  set
    status = p_response,
    explanation_seen = true,
    responded_at = now(),
    updated_at = now()
  where id = p_offer_id;

  if p_response = 'accepted' then
    v_adjustment_id := 'fee-adjustment-beca-' || v_offer.fee_id || '-' || v_offer.player_id;

    update public.fee_adjustments
    set active = false, updated_at = now()
    where player_id = v_offer.player_id
      and fee_id = v_offer.fee_id
      and id <> v_adjustment_id
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
      v_adjustment_id,
      v_offer.player_id,
      v_offer.fee_id,
      'monto_final',
      0,
      'beca',
      'Beca solidaria ' || v_offer.month,
      true,
      now(),
      now()
    )
    on conflict (id) do update set
      adjustment_type = excluded.adjustment_type,
      final_amount = excluded.final_amount,
      reason = excluded.reason,
      observation = excluded.observation,
      active = true,
      updated_at = now();
  end if;

  perform public.refresh_scholarship_offers();
end;
$$;

grant execute on function public.admin_list_scholarship_offers(text) to anon, authenticated;
grant execute on function public.list_player_scholarship_offers(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_scholarship_offer(text, jsonb) to anon, authenticated;
grant execute on function public.respond_scholarship_offer(text, text, text, text) to anon, authenticated;
grant execute on function public.refresh_scholarship_offers() to anon, authenticated;
