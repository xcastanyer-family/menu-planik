-- =========================================================================
-- MenuPlanik PostgreSQL / Supabase Complete Database Schema
-- Model d'Autenticació i Accés Basat en 3 Rols:
--   1. superadmin: Valida comptes d'admin, modera receptes públiques i té accés global.
--   2. admin:      Es registra amb compte Supabase. En ser aprovat pel superadmin,
--                  crea el grup de família i genera el codi d'accés (ex. "FAM-7492").
--   3. user:       Es dóna d'alta amb compte Supabase i s'uneix a la família
--                  introduint el codi subministrat pel seu admin.
-- =========================================================================

-- Activa l'extensió UUID
create extension if not exists "uuid-ossp";

-- 1. Taula de Famílies (Creades per un Admin autenticat)
create table if not exists public.families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique, -- Codi únic d'accés per als membres, ex: "FAM-7492"
  admin_id uuid references auth.users(id) on delete cascade not null,
  admin_email text not null,
  admin_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamp with time zone,
  approved_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Perfils d'Usuaris (Extend auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'user' check (role in ('superadmin', 'admin', 'user')),
  status text not null default 'active' check (status in ('pending', 'approved', 'rejected', 'active')),
  family_id uuid references public.families(id) on delete set null,
  rejection_reason text,
  household_size int default 2,
  dietary_preference text default 'mediterranean',
  daily_calorie_target int default 2000,
  allergies text[] default array[]::text[],
  disliked_ingredients text[] default array[]::text[],
  cooking_skill_level text default 'intermediate',
  max_cooking_time_minutes int default 30,
  budget_level text default 'moderate',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Membres de la Família
create table if not exists public.family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  color text default '#16a34a',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(family_id, user_id)
);

-- 4. Receptari (Receptes privades de família o validades pel Superadmin per al catàleg públic)
create table if not exists public.recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  family_id uuid references public.families(id) on delete cascade,
  author_name text,
  title text not null,
  description text,
  prep_time_minutes int default 10,
  cook_time_minutes int default 15,
  servings int default 2,
  calories int default 400,
  nutrition jsonb default '{"calories": 400, "protein": 20, "carbs": 50, "fat": 15}'::jsonb,
  tags text[] default array[]::text[],
  dietary_tags text[] default array[]::text[],
  ingredients jsonb not null default '[]'::jsonb,
  instructions text[] not null default array[]::text[],
  image_url text,
  source text default 'custom',
  difficulty text default 'easy',
  moderation_status text not null default 'private' check (moderation_status in ('private', 'pending_review', 'approved_public', 'rejected')),
  is_public boolean not null default false,
  rejection_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Plans de Menús Setmanals
create table if not exists public.meal_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  family_id uuid references public.families(id) on delete cascade,
  week_start_date date not null,
  title text not null,
  household_size int default 2,
  target_daily_calories int default 2000,
  dietary_preference text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Àpats individuals dins del Menú (Esmorzar, Dinar, Sopar)
create table if not exists public.meal_slots (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references public.meal_plans(id) on delete cascade not null,
  day text not null, -- monday, tuesday, etc.
  meal_type text not null, -- breakfast, lunch, dinner, snack
  recipe_id uuid references public.recipes(id) on delete set null,
  custom_notes text,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Llista de la Compra Compartida de la Família
create table if not exists public.grocery_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  family_id uuid references public.families(id) on delete cascade,
  meal_plan_id uuid references public.meal_plans(id) on delete cascade,
  name text not null,
  amount numeric(10,2) default 1,
  unit text not null,
  category text default 'other',
  checked boolean default false,
  recipe_source text,
  added_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Rebost i Nevera de la Llar
create table if not exists public.pantry_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  family_id uuid references public.families(id) on delete cascade,
  name text not null,
  amount numeric(10,2) default 1,
  unit text not null,
  category text default 'other',
  expiry_date date,
  is_low boolean default false,
  added_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- FUNCIONS AUXILIARS I TRIGGERS PER A REGISTRE AUTOMÀTIC
-- =========================================================================

-- Funció per obtenir el rol de l'usuari actual
create or replace function public.get_current_role()
returns text language sql security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Funció per obtenir la família de l'usuari actual
create or replace function public.get_current_family_id()
returns uuid language sql security definer as $$
  select family_id from public.profiles where id = auth.uid();
$$;

-- Trigger d'alta a auth.users: processa el rol, família i codi
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  target_role text;
  target_name text;
  target_family_code text;
  target_family_name text;
  found_family_id uuid;
  new_family_id uuid;
  random_code text;
begin
  target_role := coalesce(new.raw_user_meta_data->>'role', 'user');
  target_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  target_family_code := upper(trim(coalesce(new.raw_user_meta_data->>'family_code', '')));
  target_family_name := trim(coalesce(new.raw_user_meta_data->>'family_name', ''));

  -- Cas 1: Superadministrador (determinat per correu o metadada)
  if new.email = 'admin@menuplanik.cat' or target_role = 'superadmin' then
    insert into public.profiles (id, email, full_name, role, status)
    values (new.id, new.email, target_name, 'superadmin', 'active');
    return new;
  end if;

  -- Cas 2: Administrador de Família (Registra una nova família que queda en estat 'pending')
  if target_role = 'admin' then
    random_code := 'FAM-' || floor(1000 + random() * 9000)::text;
    if target_family_name = '' then
      target_family_name := 'Família de ' || target_name;
    end if;

    insert into public.families (name, code, admin_id, admin_email, admin_name, status)
    values (target_family_name, random_code, new.id, new.email, target_name, 'pending')
    returning id into new_family_id;

    insert into public.profiles (id, email, full_name, role, status, family_id)
    values (new.id, new.email, target_name, 'admin', 'pending', new_family_id);

    insert into public.family_members (family_id, user_id, name, email, role, color)
    values (new_family_id, new.id, target_name, new.email, 'admin', '#16a34a');

    return new;
  end if;

  -- Cas 3: Usuari normal que s'uneix amb codi de família
  if target_family_code <> '' then
    select id into found_family_id from public.families where code = target_family_code limit 1;
  end if;

  insert into public.profiles (id, email, full_name, role, status, family_id)
  values (new.id, new.email, target_name, 'user', 'active', found_family_id);

  if found_family_id is not null then
    insert into public.family_members (family_id, user_id, name, email, role, color)
    values (found_family_id, new.id, target_name, new.email, 'user', '#0284c7')
    on conflict (family_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Registra el trigger d'alta
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_slots enable row level security;
alter table public.grocery_items enable row level security;
alter table public.pantry_items enable row level security;

-- Polítiques per a Families:
create policy "Superadmin te acces total a families"
  on public.families for all using (public.get_current_role() = 'superadmin');

create policy "Admins poden veure i editar la seva familia"
  on public.families for all using (admin_id = auth.uid());

create policy "Membres poden consultar la seva familia"
  on public.families for select using (id = public.get_current_family_id());

-- Polítiques per a Profiles:
create policy "Superadmin te acces total a perfils"
  on public.profiles for all using (public.get_current_role() = 'superadmin');

create policy "Usuaris poden veure i editar el seu perfil"
  on public.profiles for all using (id = auth.uid());

-- Polítiques per a Family Members:
create policy "Superadmin te acces total a membres"
  on public.family_members for all using (public.get_current_role() = 'superadmin');

create policy "Membres de la familia poden veure els seus companys"
  on public.family_members for select using (family_id = public.get_current_family_id());

create policy "Admins de familia poden gestionar membres"
  on public.family_members for all using (
    family_id in (select id from public.families where admin_id = auth.uid())
  );

-- Polítiques per a Receptes:
create policy "Superadmin te acces total a receptes"
  on public.recipes for all using (public.get_current_role() = 'superadmin');

create policy "Tothom pot veure receptes publiques aprovades"
  on public.recipes for select using (is_public = true or moderation_status = 'approved_public' or source = 'curated');

create policy "Membres poden gestionar receptes de la seva familia"
  on public.recipes for all using (family_id = public.get_current_family_id());

-- Polítiques per a Menús, Compra i Rebost:
create policy "Acces per familia a plans de menus"
  on public.meal_plans for all using (
    public.get_current_role() = 'superadmin' or family_id = public.get_current_family_id()
  );

create policy "Acces per familia a llista de la compra"
  on public.grocery_items for all using (
    public.get_current_role() = 'superadmin' or family_id = public.get_current_family_id()
  );

create policy "Acces per familia a rebost"
  on public.pantry_items for all using (
    public.get_current_role() = 'superadmin' or family_id = public.get_current_family_id()
  );
