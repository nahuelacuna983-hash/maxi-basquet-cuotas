alter table public.fees
add column if not exists sunday_dates date[];

create or replace function public.admin_upsert_fee(
  p_admin_pin text,
  p_fee jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month text := p_fee->>'month';
  v_training_session_cost numeric := coalesce((p_fee->>'training_session_cost')::numeric, 0);
  v_sunday_cost numeric := coalesce((p_fee->>'sunday_cost')::numeric, 0);
  v_training_billing_base numeric := nullif(p_fee->>'training_billing_base', '')::numeric;
  v_sunday_billing_base numeric := nullif(p_fee->>'sunday_billing_base', '')::numeric;
  v_fixed_training_only_amount numeric := nullif(p_fee->>'fixed_training_only_amount', '')::numeric;
  v_fixed_competitor_amount numeric := nullif(p_fee->>'fixed_competitor_amount', '')::numeric;
  v_cash_adjustment_amount numeric := coalesce((p_fee->>'cash_adjustment_amount')::numeric, 0);
  v_interest_percent numeric := coalesce((p_fee->>'interest_percent')::numeric, 0);
  v_due_day integer := coalesce((p_fee->>'due_day')::integer, 10);
  v_sunday_dates date[];
begin
  if p_admin_pin <> '1234' then
    raise exception 'PIN admin invalido';
  end if;

  if coalesce(p_fee->>'id', '') = '' or coalesce(v_month, '') !~ '^\d{4}-\d{2}$' then
    raise exception 'Cuota invalida';
  end if;

  if v_training_session_cost <= 0 or v_sunday_cost < 0 or v_interest_percent < 0 then
    raise exception 'Valores de cuota invalidos';
  end if;

  if v_due_day < 1 or v_due_day > 31 then
    raise exception 'Dia de vencimiento invalido';
  end if;

  if jsonb_typeof(p_fee->'sunday_dates') = 'array' then
    select coalesce(array_agg(distinct item::date order by item::date), array[]::date[])
      into v_sunday_dates
    from jsonb_array_elements_text(p_fee->'sunday_dates') as dates(item);

    if exists (
      select 1
      from unnest(v_sunday_dates) as selected(day)
      where to_char(selected.day, 'YYYY-MM') <> v_month
        or extract(dow from selected.day) <> 0
    ) then
      raise exception 'Las fechas de partido deben ser domingos del mes de la cuota';
    end if;
  else
    v_sunday_dates := null;
  end if;

  insert into public.fees (
    id,
    month,
    training_session_cost,
    sunday_cost,
    training_billing_base,
    sunday_billing_base,
    fixed_training_only_amount,
    fixed_competitor_amount,
    cash_adjustment_amount,
    interest_percent,
    due_day,
    sunday_dates,
    updated_at
  )
  values (
    p_fee->>'id',
    v_month,
    v_training_session_cost,
    v_sunday_cost,
    v_training_billing_base,
    v_sunday_billing_base,
    v_fixed_training_only_amount,
    v_fixed_competitor_amount,
    v_cash_adjustment_amount,
    v_interest_percent,
    v_due_day,
    v_sunday_dates,
    now()
  )
  on conflict (id) do update
  set
    month = excluded.month,
    training_session_cost = excluded.training_session_cost,
    sunday_cost = excluded.sunday_cost,
    training_billing_base = excluded.training_billing_base,
    sunday_billing_base = excluded.sunday_billing_base,
    fixed_training_only_amount = excluded.fixed_training_only_amount,
    fixed_competitor_amount = excluded.fixed_competitor_amount,
    cash_adjustment_amount = excluded.cash_adjustment_amount,
    interest_percent = excluded.interest_percent,
    due_day = excluded.due_day,
    sunday_dates = excluded.sunday_dates,
    updated_at = now();
end;
$$;

grant execute on function public.admin_upsert_fee(text, jsonb) to anon, authenticated;
