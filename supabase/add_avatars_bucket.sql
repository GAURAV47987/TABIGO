-- Run this once in the SQL Editor. Creates a public storage bucket for
-- profile photos, with each user only able to upload/replace/delete their
-- own (the object's filename is their user id), while anyone can view any
-- avatar (needed so it actually displays in the app).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar_upload_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = name);

create policy "avatar_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = name);

create policy "avatar_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = name);
