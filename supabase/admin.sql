-- Grants one specific email a read-only "see everything" view across all
-- users' trips, for a developer/admin account. Change the email below if
-- yours differs. Run this once in the SQL Editor (after schema.sql).

create or replace function public.admin_list_trips()
returns table (
  id uuid,
  user_email text,
  destination_name text,
  start_date date,
  end_date date,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') <> 'patelgaurav77@gmail.com' then
    raise exception 'not authorized';
  end if;
  return query
    select t.id, u.email, t.destination_name, t.start_date, t.end_date, t.created_at
    from public.trips t
    join auth.users u on u.id = t.user_id
    order by t.created_at desc;
end;
$$;

grant execute on function public.admin_list_trips() to authenticated;
