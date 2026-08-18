create table if not exists public.fee_adjustments (
  id text primary key,
  player_id text not null references public.players(id) on delete cascade,
  fee_id text not null references public.fees(id) on delete cascade,
  adjustment_type text not null default 'monto_final' check (
    adjustment_type in ('monto_final')
  ),
  final_amount numeric not null check (final_amount >= 0),
  reason text not null default 'otro' check (
    reason in ('viaje', 'lesion', 'permiso', 'ingreso_tarde', 'otro')
  ),
  observation text default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fee_adjustments_active_player_fee_unique
on public.fee_adjustments (player_id, fee_id)
where active = true;

alter table public.fee_adjustments enable row level security;

drop policy if exists "fee_adjustments_select_active" on public.fee_adjustments;
drop policy if exists "fee_adjustments_no_direct_insert" on public.fee_adjustments;
drop policy if exists "fee_adjustments_no_direct_update" on public.fee_adjustments;
drop policy if exists "fee_adjustments_no_direct_delete" on public.fee_adjustments;

create policy "fee_adjustments_select_active"
on public.fee_adjustments
for select
using (active = true);

create or replace function public.admin_upsert_fee_adjustment(
  p_admin_pin text,
  p_adjustment jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := p_adjustment->>'id';
  v_player_id text := p_adjustment->>'player_id';
  v_fee_id text := p_adjustment->>'fee_id';
  v_adjustment_type text := coalesce(p_adjustment->>'adjustment_type', 'monto_final');
  v_final_amount numeric := coalesce((p_adjustment->>'final_amount')::numeric, 0);
  v_reason text := coalesce(p_adjustment->>'reason', 'otro');
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if coalesce(v_id, '') = '' or coalesce(v_player_id, '') = '' or coalesce(v_fee_id, '') = '' then
    raise exception 'Ajuste invalido';
  end if;

  if v_adjustment_type <> 'monto_final' then
    raise exception 'Tipo de ajuste invalido';
  end if;

  if v_final_amount < 0 then
    raise exception 'Monto final invalido';
  end if;

  if v_reason not in ('viaje', 'lesion', 'permiso', 'ingreso_tarde', 'otro') then
    raise exception 'Motivo invalido';
  end if;

  update public.fee_adjustments
  set active = false, updated_at = now()
  where player_id = v_player_id
    and fee_id = v_fee_id
    and id <> v_id
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
    v_id,
    v_player_id,
    v_fee_id,
    v_adjustment_type,
    v_final_amount,
    v_reason,
    coalesce(p_adjustment->>'observation', ''),
    coalesce((p_adjustment->>'active')::boolean, true),
    coalesce(nullif(p_adjustment->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (id) do update set
    player_id = excluded.player_id,
    fee_id = excluded.fee_id,
    adjustment_type = excluded.adjustment_type,
    final_amount = excluded.final_amount,
    reason = excluded.reason,
    observation = excluded.observation,
    active = excluded.active,
    updated_at = now();
end;
$$;

create or replace function public.admin_delete_fee_adjustment(
  p_admin_pin text,
  p_adjustment_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  update public.fee_adjustments
  set active = false, updated_at = now()
  where id = p_adjustment_id;
end;
$$;

grant select on public.fee_adjustments to anon, authenticated;
grant execute on function public.admin_upsert_fee_adjustment(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_fee_adjustment(text, text) to anon, authenticated;
