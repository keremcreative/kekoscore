-- kekoscore: üyelik, sohbet ve "Kim kazanır?" anketi
-- Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırman yeterli.

-- Profiller: her kullanıcının benzersiz kullanıcı adı
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  created_at timestamptz not null default now()
);

-- Yeni kayıtta profili otomatik oluştur. Kullanıcı adı kayıt formundan gelir;
-- Google ile girenlerde e-postanın başından türetilir.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  base := regexp_replace(base, '[^a-z0-9_.]', '', 'g');
  if length(base) < 3 then base := base || 'kullanici'; end if;
  base := left(base, 16);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Kayıt formunda "bu kullanıcı adı alınmış mı?" kontrolü için (giriş yapmadan çağrılabilir)
create or replace function public.username_taken(name text)
returns boolean
language sql
security definer set search_path = public
stable
as $$ select exists (select 1 from public.profiles where username = lower(name)) $$;

-- Sohbet mesajları
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  room text not null default 'genel',
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_room_created_idx on public.messages (room, created_at desc);

-- Maç anketi: her kullanıcı her maç için bir oy
create table if not exists public.votes (
  match_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  pick text not null check (pick in ('home', 'draw', 'away')),
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

-- Güvenlik: yalnızca giriş yapmış kullanıcılar okuyup yazabilir, herkes sadece kendi adına yazar
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.votes enable row level security;

drop policy if exists "profiller okunur" on public.profiles;
create policy "profiller okunur" on public.profiles for select to authenticated using (true);

drop policy if exists "mesajlar okunur" on public.messages;
create policy "mesajlar okunur" on public.messages for select to authenticated using (true);
drop policy if exists "kendi mesajini yazar" on public.messages;
create policy "kendi mesajini yazar" on public.messages for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "kendi mesajini siler" on public.messages;
create policy "kendi mesajini siler" on public.messages for delete to authenticated using (user_id = auth.uid());

drop policy if exists "oylar okunur" on public.votes;
create policy "oylar okunur" on public.votes for select to authenticated using (true);
drop policy if exists "kendi oyunu verir" on public.votes;
create policy "kendi oyunu verir" on public.votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "kendi oyunu degistirir" on public.votes;
create policy "kendi oyunu degistirir" on public.votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant execute on function public.username_taken(text) to anon, authenticated;

-- Canlı sohbet ve anket için gerçek zamanlı yayın
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.votes;
exception when duplicate_object then null;
end $$;
