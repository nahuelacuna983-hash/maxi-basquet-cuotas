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
  response_deadline date,
  explanation_seen boolean not null default false,
  note text default '',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scholarship_offers enable row level security;

drop policy if exists "scholarship_offers_no_direct_select" on public.scholarship_offers;
drop policy if exists "scholarship_offers_no_direct_insert" on public.scholarship_offers;
drop policy if exists "scholarship_offers_no_direct_update" on public.scholarship_offers;
drop policy if exists "scholarship_offers_no_direct_delete" on public.scholarship_offers;

create or replace function public.admin_list_scholarship_offers(p_admin_pin text)
returns table (
  id text,
  fee_id text,
  month text,
  player_id text,
  status text,
  response_deadline date,
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
  response_deadline date,
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
  v_response_deadline date := nullif(p_offer->>'response_deadline', '')::date;
  v_fee_month text;
  v_player record;
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

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
    v_response_deadline,
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

  select * into v_offer
  from public.scholarship_offers
  where id = p_offer_id
    and player_id = p_player_id
    and status = 'pending';

  if v_offer.id is null then
    raise exception 'Beca pendiente inexistente';
  end if;

  if v_offer.response_deadline is not null and v_offer.response_deadline < current_date then
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
end;
$$;

grant execute on function public.admin_list_scholarship_offers(text) to anon, authenticated;
grant execute on function public.list_player_scholarship_offers(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_scholarship_offer(text, jsonb) to anon, authenticated;
grant execute on function public.respond_scholarship_offer(text, text, text, text) to anon, authenticated;
