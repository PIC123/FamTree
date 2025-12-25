-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Family Members Table
create table family_members (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  birth_date date,
  death_date date,
  gender text check (gender in ('male', 'female', 'other')),
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Relationships Table
create table relationships (
  id uuid primary key default uuid_generate_v4(),
  from_member_id uuid references family_members(id) on delete cascade not null,
  to_member_id uuid references family_members(id) on delete cascade not null,
  type text check (type in ('parent', 'spouse')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Media Table
create table media (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references family_members(id) on delete cascade not null,
  type text check (type in ('image', 'video', 'audio', 'note')) not null,
  url text not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Storage Bucket Setup (You need to run this part manually in the dashboard usually, but SQL can trigger it if permissions allow)
insert into storage.buckets (id, name, public) values ('family-media', 'family-media', true);

-- 5. Storage Policies (Allow public read, allow authenticated upload/insert/update/delete)
-- READ
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'family-media' );

-- UPLOAD (Allow anyone for now as it's a family app, or restrict to authenticated users)
create policy "Anyone can upload"
  on storage.objects for insert
  with check ( bucket_id = 'family-media' );

create policy "Anyone can update"
  on storage.objects for update
  with check ( bucket_id = 'family-media' );
  
create policy "Anyone can delete"
  on storage.objects for delete
  using ( bucket_id = 'family-media' );

