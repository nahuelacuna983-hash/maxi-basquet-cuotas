alter table public.treasury_movements
drop constraint if exists treasury_movements_category_check;

alter table public.treasury_movements
add constraint treasury_movements_category_check
check (
  category in (
    'entrenamiento',
    'domingo',
    'seguro_documentacion',
    'aporte_club',
    'otro'
  )
);

create or replace function public.admin_upsert_treasury_movement(
  p_admin_pin text,
  p_movement jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := p_movement->>'id';
  v_fee_id text := p_movement->>'fee_id';
  v_month text := p_movement->>'month';
  v_category text := coalesce(p_movement->>'category', 'otro');
  v_source text := coalesce(p_movement->>'source', 'manual');
  v_amount numeric := coalesce((p_movement->>'amount')::numeric, 0);
  v_occurred_at date := (p_movement->>'occurred_at')::date;
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if coalesce(v_id, '') = '' or coalesce(v_fee_id, '') = '' or coalesce(v_month, '') !~ '^\d{4}-\d{2}$' then
    raise exception 'Movimiento de caja invalido';
  end if;

  if v_category not in ('entrenamiento', 'domingo', 'seguro_documentacion', 'aporte_club', 'otro') then
    raise exception 'Concepto invalido';
  end if;

  if v_source not in ('manual', 'auto') then
    raise exception 'Origen invalido';
  end if;

  if v_amount <= 0 then
    raise exception 'Monto invalido';
  end if;

  insert into public.treasury_movements (
    id,
    fee_id,
    month,
    movement_type,
    category,
    amount,
    occurred_at,
    description,
    source,
    active,
    created_at,
    updated_at
  )
  values (
    v_id,
    v_fee_id,
    v_month,
    'egreso',
    v_category,
    v_amount,
    v_occurred_at,
    coalesce(p_movement->>'description', ''),
    v_source,
    coalesce((p_movement->>'active')::boolean, true),
    coalesce(nullif(p_movement->>'created_at', '')::timestamptz, now()),
    now()
  )
  on conflict (id) do update
  set
    fee_id = excluded.fee_id,
    month = excluded.month,
    movement_type = excluded.movement_type,
    category = excluded.category,
    amount = excluded.amount,
    occurred_at = excluded.occurred_at,
    description = excluded.description,
    source = excluded.source,
    active = excluded.active,
    updated_at = now();
end;
$$;

grant execute on function public.admin_upsert_treasury_movement(text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
