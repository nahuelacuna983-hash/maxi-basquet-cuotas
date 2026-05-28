create or replace function public.admin_delete_guest_attendance(
  p_admin_pin text,
  p_attendance_id text
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
  where id = p_attendance_id
    and participant_type = 'guest';
end;
$$;

grant execute on function public.admin_delete_guest_attendance(text, text) to anon, authenticated;
