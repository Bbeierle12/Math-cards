-- Profiles table
create table if not exists profiles (
  uid uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'User',
  email text not null default '',
  photo_url text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  last_login_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = uid);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = uid);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = uid);

-- User progress table (stores JSON blob)
create table if not exists user_progress (
  uid uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

alter table user_progress enable row level security;

create policy "Users can read own progress"
  on user_progress for select using (auth.uid() = uid);
create policy "Users can insert own progress"
  on user_progress for insert with check (auth.uid() = uid);
create policy "Users can update own progress"
  on user_progress for update using (auth.uid() = uid);

-- User settings table (stores JSON blob)
create table if not exists user_settings (
  uid uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

alter table user_settings enable row level security;

create policy "Users can read own settings"
  on user_settings for select using (auth.uid() = uid);
create policy "Users can insert own settings"
  on user_settings for insert with check (auth.uid() = uid);
create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = uid);
