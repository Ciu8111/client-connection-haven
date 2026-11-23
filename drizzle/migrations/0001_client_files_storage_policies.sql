
create policy "Client folder read" on storage.objects for select to authenticated
  using (bucket_id = 'client-files' and public.can_access_client(((storage.foldername(name))[1])::uuid));
create policy "Client folder upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files' and public.can_access_client(((storage.foldername(name))[1])::uuid));
create policy "Client folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'client-files' and (public.is_client_coach(((storage.foldername(name))[1])::uuid) or owner = auth.uid()));
