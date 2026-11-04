-- kekoscore: maç hatırlatmaları ve bildirim ayarları.
-- goller.sql'i daha önce çalıştırdıysan yalnızca bu dosyayı SQL Editor'de bir kez çalıştır.
-- Yeni bir zamanlayıcı gerekmez: dakikada bir çalışan /api/goller hatırlatmaları da gönderir.

-- Her kullanıcının bildirim tercihleri (satır yoksa hepsi açık sayılır)
create table if not exists public.notif_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  chat boolean not null default true,     -- sohbette yeni mesaj
  big_tr boolean not null default true,   -- GS, FB, BJK, TS ve Milli Takım maçından 30 dk önce
  big_eu boolean not null default true,   -- Avrupa devlerinin maçından 30 dk önce
  fav boolean not null default true,      -- favori takım: 30 dk kala, başladı, gol, maç sonu
  updated_at timestamptz not null default now()
);
alter table public.notif_prefs enable row level security;
drop policy if exists "kendi tercihini gorur" on public.notif_prefs;
create policy "kendi tercihini gorur" on public.notif_prefs for select to authenticated using (user_id = auth.uid());
drop policy if exists "kendi tercihini ekler" on public.notif_prefs;
create policy "kendi tercihini ekler" on public.notif_prefs for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "kendi tercihini gunceller" on public.notif_prefs;
create policy "kendi tercihini gunceller" on public.notif_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.notif_prefs to authenticated;
revoke all on public.notif_prefs from anon;

-- Gönderilen hatırlatmaların kaydı (aynı bildirim iki kez gitmesin; yalnızca sunucu kullanır)
create table if not exists public.notice_log (
  key text primary key,
  sent_at timestamptz not null default now()
);
alter table public.notice_log enable row level security;
revoke all on public.notice_log from anon, authenticated;

-- Eski kayıtları haftada bir temizle
do $$
begin
  perform cron.unschedule('kekoscore-temizlik');
exception when others then null;
end $$;
select cron.schedule('kekoscore-temizlik', '0 4 * * 1', $job$
  delete from public.notice_log where sent_at < now() - interval '7 days';
  delete from public.goal_state where updated_at < now() - interval '7 days';
$job$);
