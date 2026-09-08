-- ============================================================
-- Chai & Charcha — Supabase schema (migration 0001)
-- Run this in: Supabase Dashboard → SQL Editor (or via CLI up)
-- Safe to run multiple times (IF NOT EXISTS / DROP-policy guards).
-- ============================================================

create extension if not exists pg_trgm;

-- ------------------------------------------------------------
-- Categories (menu sections)
-- ------------------------------------------------------------
create table if not exists public.categories (
  id         text        primary key,
  label      text        not null,
  icon       text        not null default '🍽️',
  sub        text        not null default '',
  sort_order smallint    not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Products (menu items — mirrors app.js MENU shape)
-- ------------------------------------------------------------
create table if not exists public.products (
  id           text        primary key
               check (id ~ '^[a-zA-Z0-9_-]+$'),
  category_id  text        not null references public.categories(id) on delete restrict,
  name         text        not null check (char_length(name) between 1 and 120),
  price        integer     not null check (price >= 0 and price <= 1000000),
  badge        text        check (badge is null or badge in ('popular', 'new')),
  emoji        text        not null default '☕',
  img          text        not null default '',
  short        text        not null default '',
  about        text        not null default '',
  ingredients  jsonb       not null default '[]'::jsonb
                           check (jsonb_typeof(ingredients) = 'array'),
  addons       jsonb       not null default '[]'::jsonb
                           check (jsonb_typeof(addons) = 'array'),
  sort_order   smallint    not null default 0,
  is_visible   boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_is_visible_idx  on public.products (is_visible);
create index if not exists products_name_idx        on public.products (name);
create index if not exists products_badge_idx       on public.products (badge);
create index if not exists products_sort_idx        on public.products (category_id, sort_order);
create index if not exists products_name_trgm_idx   on public.products using gin (name gin_trgm_ops);

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products   enable row level security;

-- Public (anon + any authenticated user): READ-ONLY.
-- Categories: everyone may read the section list.
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read
  on public.categories
  for select
  to anon, authenticated
  using (true);

-- Products: the public site may only read *visible* items.
-- Admin writes go through the serverless API (service-role),
-- so no write policies exist for anon/authenticated by design.
drop policy if exists products_public_read on public.products;
create policy products_public_read
  on public.products
  for select
  to anon, authenticated
  using (is_visible = true);

-- Defensive: deny by default for everything else.
create policy "products_no_anon_write"
  on public.products
  for all
  to anon, authenticated
  using (false);

create policy "categories_no_anon_write"
  on public.categories
  for all
  to anon, authenticated
  using (false);

-- ------------------------------------------------------------
-- Explicit grants (defense in depth)
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select                           on public.categories to anon, authenticated;
grant select                           on public.products   to anon, authenticated;
grant all privileges on public.categories, public.products  to service_role;