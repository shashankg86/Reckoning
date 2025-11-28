-- Create zones table
create table if not exists public.zones (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null
);

-- Create tables table
create table if not exists public.tables (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  zone_id uuid references public.zones(id) on delete cascade not null,
  name text not null,
  capacity integer default 4,
  shape text check (shape in ('rectangle', 'circle')) default 'rectangle',
  x integer default 0,
  y integer default 0,
  width integer default 100,
  height integer default 100,
  is_occupied boolean default false
);

-- Enable RLS
alter table public.zones enable row level security;
alter table public.tables enable row level security;

-- Policies for zones
create policy "Users can view zones for their store"
  on public.zones for select
  using (
    exists (
      select 1 from public.store_members
      where store_members.store_id = zones.store_id
      and store_members.user_id = auth.uid()
    )
  );

create policy "Users can insert zones for their store"
  on public.zones for insert
  with check (
    exists (
      select 1 from public.store_members
      where store_members.store_id = zones.store_id
      and store_members.user_id = auth.uid()
      and store_members.role in ('owner', 'admin', 'manager')
    )
  );

create policy "Users can update zones for their store"
  on public.zones for update
  using (
    exists (
      select 1 from public.store_members
      where store_members.store_id = zones.store_id
      and store_members.user_id = auth.uid()
      and store_members.role in ('owner', 'admin', 'manager')
    )
  );

create policy "Users can delete zones for their store"
  on public.zones for delete
  using (
    exists (
      select 1 from public.store_members
      where store_members.store_id = zones.store_id
      and store_members.user_id = auth.uid()
      and store_members.role in ('owner', 'admin', 'manager')
    )
  );

-- Policies for tables
create policy "Users can view tables for their store"
  on public.tables for select
  using (
    exists (
      select 1 from public.store_members
      where store_members.store_id = tables.store_id
      and store_members.user_id = auth.uid()
    )
  );

create policy "Users can insert tables for their store"
  on public.tables for insert
  with check (
    exists (
      select 1 from public.store_members
      where store_members.store_id = tables.store_id
      and store_members.user_id = auth.uid()
      and store_members.role in ('owner', 'admin', 'manager')
    )
  );

create policy "Users can update tables for their store"
  on public.tables for update
  using (
    exists (
      select 1 from public.store_members
      where store_members.store_id = tables.store_id
      and store_members.user_id = auth.uid()
      and store_members.role in ('owner', 'admin', 'manager')
    )
  );

create policy "Users can delete tables for their store"
  on public.tables for delete
  using (
    exists (
      select 1 from public.store_members
      where store_members.store_id = tables.store_id
      and store_members.user_id = auth.uid()
      and store_members.role in ('owner', 'admin', 'manager')
    )
  );
