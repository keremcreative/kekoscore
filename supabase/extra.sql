-- kekoscore: favoriler ve skor tahmini.
-- schema.sql'i daha önce çalıştırdıysan yalnızca bu dosyayı SQL Editor'de bir kez çalıştır.

-- Favoriler: takım, oyuncu ya da lig. ref ör. "eng.1/359" (takım/oyuncu) veya "tur.1" (lig)
create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('team', 'player', 'league')),
  ref text not null check (length(ref) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

alter table public.favorites enable row level security;
drop policy if exists "kendi favorilerini gorur" on public.favorites;
create policy "kendi favorilerini gorur" on public.favorites for select to authenticated using (user_id = auth.uid());
drop policy if exists "kendi favorisini ekler" on public.favorites;
create policy "kendi favorisini ekler" on public.favorites for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "kendi favorisini siler" on public.favorites;
create policy "kendi favorisini siler" on public.favorites for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.favorites to authenticated;
revoke all on public.favorites from anon;

-- Skor tahminleri. Yazma işini yalnızca sunucu yapar (/api/tahmin): maçın başlamadığını
-- ESPN'den doğrular, başlama saatini kendisi yazar. Böylece maç başladıktan sonra tahmin girilemez.
create table if not exists public.predictions (
  match_id text not null,
  league text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  home smallint not null check (home between 0 and 20),
  away smallint not null check (away between 0 and 20),
  kickoff timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
create index if not exists predictions_kickoff_idx on public.predictions (kickoff);

alter table public.predictions enable row level security;
-- Kendi tahminini her zaman, arkadaşlarınınkini maç başlayınca görürsün (kopya çekilmesin)
drop policy if exists "tahminler okunur" on public.predictions;
create policy "tahminler okunur" on public.predictions for select to authenticated
  using (user_id = auth.uid() or kickoff <= now());
grant select on public.predictions to authenticated;
revoke all on public.predictions from anon;
