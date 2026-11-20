-- Run this once in the Supabase SQL Editor (same project as both apps).
-- Lets a trip's owner invite other people to view or edit it.
--
-- Invites are by email and don't require the invitee to have signed up
-- yet: a row is created with invited_email set and user_id null. The
-- invitee only sees it (via list_my_pending_invites) once they're signed
-- in with that same email, and explicitly accepts or declines it — it's
-- never auto-attached. This also leaves room for link-based sharing
-- later without a schema change: a link invite would just be a row with
-- no invited_email, claimed by a token instead of by email match.
--
-- Every write (invite/accept/decline/remove/leave/role change) goes
-- through a security-definer function below, not direct table access —
-- there are deliberately no insert/update/delete RLS policies on
-- trip_collaborators, so a client can only ever read rows, never tamper
-- with them (e.g. an invitee bumping their own role while accepting).

create table if not exists public.trip_collaborators (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  invited_email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists trip_collaborators_trip_email_idx
  on public.trip_collaborators(trip_id, lower(invited_email));
create index if not exists trip_collaborators_trip_id_idx on public.trip_collaborators(trip_id);
create index if not exists trip_collaborators_user_id_idx on public.trip_collaborators(user_id);

alter table public.trip_collaborators enable row level security;

-- Read-only policies. All writes happen through the functions below.
create policy "trip_collaborators_owner_select" on public.trip_collaborators
  for select using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

create policy "trip_collaborators_invitee_select" on public.trip_collaborators
  for select using (
    user_id = auth.uid() or lower(invited_email) = lower(auth.jwt() ->> 'email')
  );

-- trips' own SELECT policy used to query trip_collaborators directly, and
-- trip_collaborators_owner_select (above) queries trips right back —
-- two RLS policies each reading the other's protected table is a cycle,
-- and Postgres refuses it outright ("infinite recursion detected in
-- policy for relation trips"), which broke trip creation entirely for
-- every user, not just shared trips. A SECURITY DEFINER function breaks
-- the cycle: its own query against trip_collaborators runs as the
-- function's owner, which bypasses that table's RLS instead of
-- re-evaluating it, so checking collaborator status from inside trips'
-- policy no longer loops back through trip_collaborators' policies.
create or replace function public.is_trip_collaborator(p_trip_id uuid, p_role text default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trip_collaborators
    where trip_id = p_trip_id and user_id = auth.uid() and status = 'accepted'
      and (p_role is null or role = p_role)
  );
$$;
revoke all on function public.is_trip_collaborator(uuid, text) from public, anon;
grant execute on function public.is_trip_collaborator(uuid, text) to authenticated;

-- A shared trip is visible/editable the same way an owned one is, once
-- the invite has actually been accepted (not merely sent).
drop policy if exists "trips_select_own" on public.trips;
drop policy if exists "trips_select_own_or_shared" on public.trips;
create policy "trips_select_own_or_shared" on public.trips
  for select using (
    auth.uid() = user_id or public.is_trip_collaborator(id)
  );

drop policy if exists "trips_update_own" on public.trips;
drop policy if exists "trips_update_own_or_editor" on public.trips;
create policy "trips_update_own_or_editor" on public.trips
  for update using (
    auth.uid() = user_id or public.is_trip_collaborator(id, 'editor')
  );

-- Document storage: extend the existing owner-only policies so an editor
-- collaborator can also read/add/remove files, keyed by trip id (the
-- second folder segment: "<owner id>/<trip id>/<file>"), not just the
-- owner's own id (the first segment, which the original policies check).
drop policy if exists "trip_docs_select_shared" on storage.objects;
drop policy if exists "trip_docs_insert_shared" on storage.objects;
drop policy if exists "trip_docs_delete_shared" on storage.objects;

create policy "trip_docs_select_shared" on storage.objects
  for select using (
    bucket_id = 'trip-documents' and exists (
      select 1 from public.trip_collaborators c
      where c.user_id = auth.uid() and c.status = 'accepted'
        and c.trip_id::text = (storage.foldername(name))[2]
    )
  );

create policy "trip_docs_insert_shared" on storage.objects
  for insert with check (
    bucket_id = 'trip-documents' and exists (
      select 1 from public.trip_collaborators c
      where c.user_id = auth.uid() and c.status = 'accepted' and c.role = 'editor'
        and c.trip_id::text = (storage.foldername(name))[2]
    )
  );

create policy "trip_docs_delete_shared" on storage.objects
  for delete using (
    bucket_id = 'trip-documents' and exists (
      select 1 from public.trip_collaborators c
      where c.user_id = auth.uid() and c.status = 'accepted' and c.role = 'editor'
        and c.trip_id::text = (storage.foldername(name))[2]
    )
  );

-- Owner-only: invite someone (or re-invite someone who declined/left, by
-- resetting that same row back to pending rather than erroring).
create or replace function public.invite_trip_collaborator(p_trip_id uuid, p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(p_email));
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if p_role not in ('viewer', 'editor') then
    raise exception 'invalid role';
  end if;
  if not exists (select 1 from public.trips where id = p_trip_id and user_id = v_uid) then
    raise exception 'not authorized';
  end if;
  if v_email = lower(auth.jwt() ->> 'email') then
    raise exception 'you already own this trip';
  end if;

  insert into public.trip_collaborators (trip_id, invited_email, role, status, invited_by)
  values (p_trip_id, v_email, p_role, 'pending', v_uid)
  on conflict (trip_id, lower(invited_email))
  do update set role = excluded.role, status = 'pending', user_id = null, invited_by = v_uid;
end;
$$;

-- Owner-only: change an existing collaborator's role.
create or replace function public.update_trip_collaborator_role(p_collaborator_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('viewer', 'editor') then
    raise exception 'invalid role';
  end if;
  update public.trip_collaborators c
  set role = p_role
  where c.id = p_collaborator_id
    and exists (select 1 from public.trips t where t.id = c.trip_id and t.user_id = auth.uid());
end;
$$;

-- Owner-only: revoke access outright.
create or replace function public.remove_trip_collaborator(p_collaborator_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.trip_collaborators c
  where c.id = p_collaborator_id
    and exists (select 1 from public.trips t where t.id = c.trip_id and t.user_id = auth.uid());
end;
$$;

-- Invitee: accept a pending invite addressed to their own signed-in email.
create or replace function public.accept_trip_invite(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_uid is null or v_email is null then
    raise exception 'not signed in';
  end if;
  update public.trip_collaborators
  set user_id = v_uid, status = 'accepted'
  where trip_id = p_trip_id and lower(invited_email) = v_email and status = 'pending';
end;
$$;

-- Invitee: decline instead.
create or replace function public.decline_trip_invite(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
begin
  update public.trip_collaborators
  set status = 'declined'
  where trip_id = p_trip_id and lower(invited_email) = v_email and status = 'pending';
end;
$$;

-- Collaborator: remove yourself from a trip you'd accepted.
create or replace function public.leave_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.trip_collaborators where trip_id = p_trip_id and user_id = auth.uid();
end;
$$;

-- Owner: list a trip's collaborators with their email resolved (the
-- client has no direct access to auth.users).
create or replace function public.list_trip_collaborators(p_trip_id uuid)
returns table (id uuid, role text, status text, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.trips where id = p_trip_id and user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  return query
    select c.id, c.role, c.status, coalesce(u.email, c.invited_email) as email
    from public.trip_collaborators c
    left join auth.users u on u.id = c.user_id
    where c.trip_id = p_trip_id
    order by c.created_at asc;
end;
$$;

-- Invitee: every pending invite addressed to the signed-in user, with
-- enough trip context to show "X invited you to Tokyo, as an editor".
create or replace function public.list_my_pending_invites()
returns table (collaborator_id uuid, trip_id uuid, destination_name text, role text, invited_by_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null then
    return;
  end if;
  return query
    select c.id, c.trip_id, t.destination_name, c.role, u.email
    from public.trip_collaborators c
    join public.trips t on t.id = c.trip_id
    join auth.users u on u.id = c.invited_by
    where lower(c.invited_email) = v_email and c.status = 'pending'
    order by c.created_at desc;
end;
$$;

revoke all on function public.invite_trip_collaborator(uuid, text, text) from public, anon;
revoke all on function public.update_trip_collaborator_role(uuid, text) from public, anon;
revoke all on function public.remove_trip_collaborator(uuid) from public, anon;
revoke all on function public.accept_trip_invite(uuid) from public, anon;
revoke all on function public.decline_trip_invite(uuid) from public, anon;
revoke all on function public.leave_trip(uuid) from public, anon;
revoke all on function public.list_trip_collaborators(uuid) from public, anon;
revoke all on function public.list_my_pending_invites() from public, anon;

grant execute on function public.invite_trip_collaborator(uuid, text, text) to authenticated;
grant execute on function public.update_trip_collaborator_role(uuid, text) to authenticated;
grant execute on function public.remove_trip_collaborator(uuid) to authenticated;
grant execute on function public.accept_trip_invite(uuid) to authenticated;
grant execute on function public.decline_trip_invite(uuid) to authenticated;
grant execute on function public.leave_trip(uuid) to authenticated;
grant execute on function public.list_trip_collaborators(uuid) to authenticated;
grant execute on function public.list_my_pending_invites() to authenticated;
