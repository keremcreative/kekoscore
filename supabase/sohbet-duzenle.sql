-- Sohbette mesaj düzenleme. Supabase > SQL Editor'de bir kez çalıştır.
-- (Silme zaten açıktı; bu dosya düzenlemeyi ve "düzenlendi" etiketini ekler.)

alter table public.messages add column if not exists edited_at timestamptz;

-- Herkes yalnızca kendi mesajını düzenleyebilir
drop policy if exists "kendi mesajini duzenler" on public.messages;
create policy "kendi mesajini duzenler" on public.messages
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant update (body, edited_at) on public.messages to authenticated;
