-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- User progress table
create table if not exists user_progress (
  id uuid references auth.users on delete cascade primary key,
  progress jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table user_progress enable row level security;
create policy "Users can view own progress" on user_progress for select using (auth.uid() = id);
create policy "Users can insert own progress" on user_progress for insert with check (auth.uid() = id);
create policy "Users can update own progress" on user_progress for update using (auth.uid() = id);

-- User settings table
create table if not exists user_settings (
  id uuid references auth.users on delete cascade primary key,
  settings jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;
create policy "Users can view own settings" on user_settings for select using (auth.uid() = id);
create policy "Users can insert own settings" on user_settings for insert with check (auth.uid() = id);
create policy "Users can update own settings" on user_settings for update using (auth.uid() = id);
