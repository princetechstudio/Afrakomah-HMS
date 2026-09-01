-- Run once in Supabase SQL Editor for an existing deployment.
create or replace function public.change_staff_password(p_staff_id text, p_password text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if length(coalesce(p_password, '')) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;
  update public.staff
  set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
  where staff_id = p_staff_id and active;
  if not found then
    raise exception 'Active staff account not found';
  end if;
end;
$$;
grant execute on function public.change_staff_password(text, text) to anon;
