-- =========================================================================
-- MenuPlanik Migration: Creació de la Taula de Productes (Catàleg Centralitzat)
-- Executa aquest script a l'editor SQL de Supabase per habilitar la taula de productes.
-- =========================================================================

create extension if not exists "uuid-ossp";

-- 1. Taula de Productes
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references public.families(id) on delete set null,
  name text not null,
  brand text,
  barcode text,
  category text not null default 'other',
  default_unit text not null default 'u.',
  package_size numeric(10,2),
  image_url text,
  nutrition jsonb default '{"calories": 0, "protein": 0, "carbs": 0, "fat": 0}'::jsonb,
  allergens text[] default array[]::text[],
  notes text,
  source text default 'manual', -- 'manual', 'barcode', 'ai'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexs per a cerques ultraràpides
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_products_name on public.products(name);
create index if not exists idx_products_category on public.products(category);

-- 2. Afegir camp product_id a grocery_items si no existeix
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='grocery_items' and column_name='product_id') then
    alter table public.grocery_items add column product_id uuid references public.products(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='grocery_items' and column_name='barcode') then
    alter table public.grocery_items add column barcode text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='grocery_items' and column_name='brand') then
    alter table public.grocery_items add column brand text;
  end if;
end $$;

-- 3. Habilitar RLS i Polítiques
alter table public.products enable row level security;

drop policy if exists "Productes visibles per a tothom autenticat" on public.products;
create policy "Productes visibles per a tothom autenticat"
  on public.products for select
  using (true);

drop policy if exists "Creació de productes per a tothom autenticat" on public.products;
create policy "Creació de productes per a tothom autenticat"
  on public.products for insert
  with check (true);

drop policy if exists "Edició de productes per a tothom autenticat" on public.products;
create policy "Edició de productes per a tothom autenticat"
  on public.products for update
  using (true);

drop policy if exists "Eliminació de productes per a tothom autenticat" on public.products;
create policy "Eliminació de productes per a tothom autenticat"
  on public.products for delete
  using (true);
