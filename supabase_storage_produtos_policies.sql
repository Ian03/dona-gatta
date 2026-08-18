-- Remover policies atuais excessivamente abertas do bucket `produtos`
drop policy if exists "Adicionar imagens" on storage.objects;
drop policy if exists "Imagens publicas" on storage.objects;

-- Leitura pública dos arquivos do bucket `produtos`
create policy "Public can read produtos bucket"
on storage.objects
for select
to public
using (
  bucket_id = 'produtos'
);

-- Upload apenas para admin autenticado
create policy "Admins can upload produtos bucket"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'produtos'
  and public.is_active_admin()
);

-- Update apenas para admin autenticado
create policy "Admins can update produtos bucket"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'produtos'
  and public.is_active_admin()
)
with check (
  bucket_id = 'produtos'
  and public.is_active_admin()
);

-- Delete apenas para admin autenticado
create policy "Admins can delete produtos bucket"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'produtos'
  and public.is_active_admin()
);
