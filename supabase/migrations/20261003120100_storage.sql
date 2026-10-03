-- Storage: product and brand media (admin managed) and customer review photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 5242880, array['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml', 'video/mp4']),
  ('review-photos', 'review-photos', true, 3145728, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select private.is_admin()));
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select private.is_admin()))
  with check (bucket_id = 'media' and (select private.is_admin()));
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));

-- Customers attach result photos to a review before it is moderated.
create policy "review photos anyone can upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'review-photos');
create policy "review photos admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and (select private.is_admin()));
