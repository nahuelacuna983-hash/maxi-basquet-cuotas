create or replace function public.admin_delete_guest_attendance(
  p_admin_pin text,
  p_attendance_id text,
  p_attendance_date date,
  p_guest_name text
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

  delete from public.attendances
  where participant_type = 'guest'
    and (
      id = p_attendance_id
      or (
        date = p_attendance_date
        and event_type = 'entrenamiento'
        and lower(trim(guest_name)) = lower(trim(p_guest_name))
      )
    );
end;
$$;

grant execute on function public.admin_delete_guest_attendance(text, text, date, text) to anon, authenticated;
