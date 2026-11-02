-- kekoscore: favori takım gol bildirimi.
-- 1) Vercel'e CRON_SECRET ortam değişkenini ekle (Secret türünde).
-- 2) Aşağıdaki <CRON_SECRET> yerine aynı değeri yazıp bu dosyayı SQL Editor'de bir kez çalıştır.

-- Son görülen skorlar (yalnızca sunucu okur/yazar; istemciye kapalı)
create table if not exists public.goal_state (
  match_id text primary key,
  home smallint not null default 0,
  away smallint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.goal_state enable row level security;
revoke all on public.goal_state from anon, authenticated;

-- Dakikada bir gol kontrolü
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('kekoscore-goller');
exception when others then null;
end $$;

select cron.schedule(
  'kekoscore-goller',
  '* * * * *',
  $job$
  select net.http_get(
    url := 'https://kekoscore.vercel.app/api/goller',
    headers := jsonb_build_object('authorization', 'Bearer <CRON_SECRET>'),
    timeout_milliseconds := 20000
  );
  $job$
);
