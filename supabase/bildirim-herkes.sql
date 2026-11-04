-- Kayıt olmayanlar da bildirim alabilsin: abonelikte kullanıcı zorunlu değil.
-- Supabase > SQL Editor'de bir kez çalıştır.
alter table public.push_subscriptions alter column user_id drop not null;
alter table public.push_subscriptions alter column user_id drop default;
