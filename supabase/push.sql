-- kekoscore: sohbet bildirimleri için abonelik tablosu.
-- schema.sql'i daha önce çalıştırdıysan yalnızca bu dosyayı SQL Editor'de bir kez çalıştır.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Herkes yalnızca kendi cihaz aboneliklerini görür, ekler ve siler.
-- Bildirimi gönderen sunucu, secret anahtarla tüm abonelikleri okur.
drop policy if exists "kendi aboneligini gorur" on public.push_subscriptions;
create policy "kendi aboneligini gorur" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "kendi aboneligini ekler" on public.push_subscriptions;
create policy "kendi aboneligini ekler" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "kendi aboneligini gunceller" on public.push_subscriptions;
create policy "kendi aboneligini gunceller" on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "kendi aboneligini siler" on public.push_subscriptions;
create policy "kendi aboneligini siler" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;
