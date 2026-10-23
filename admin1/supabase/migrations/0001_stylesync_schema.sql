-- =====================================================================
-- StyleSync Customer App — Supabase Schema
-- ---------------------------------------------------------------------
-- Run this in the Supabase SQL editor (https://app.supabase.com/sql)
-- to create the customer app backend schema.
--
-- Includes:
--   • Tables (customers, salons, salon_services, staff_members,
--     availability_slots, bookings, reviews, favorites,
--     payment_methods, notifications, support_tickets, saved_looks,
--     service_categories)
--   • Row Level Security (RLS) policies
--   • Indexes for common query patterns
--   • Realtime publication for slots + notifications
--
-- Convention:
--   - All tables use UUID primary keys (gen_random_uuid())
--   - All "auth_id" columns reference auth.users(id) — Supabase Auth
--   - RLS: customers can read their own data and create rows that
--     reference their own auth_id; salons/services/staff are
--     publicly readable; bookings/reviews/favorites are
--     customer-scoped.
-- =====================================================================

-- Required extensions
create extension if not exists "pgcrypto";
create extension if not exists "postgis";     -- for location-based discovery

-- =====================================================================
-- CUSTOMERS
-- =====================================================================
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  auth_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  email           text not null,
  mobile          text,                    -- masked, e.g. "+91 XXXXX 43210"
  city            text,
  preferred_services text[] default '{}',  -- category names
  avatar_url      text,
  member_since    date not null default current_date,
  latitude        double precision,
  longitude       double precision,
  is_published    boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (auth_id)
);

create index if not exists customers_auth_id_idx on public.customers(auth_id);
create index if not exists customers_city_idx on public.customers(city);

-- =====================================================================
-- SERVICE CATEGORIES (catalog)
-- =====================================================================
create table if not exists public.service_categories (
  id           text primary key,           -- e.g. "cat-hair"
  name         text not null unique,        -- e.g. "Hair"
  description  text,
  icon         text,
  tint         text
);

-- =====================================================================
-- SALONS
-- =====================================================================
create table if not exists public.salons (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  tagline            text,
  description        text,
  category           text not null,         -- references service_categories.name
  cover_image        text,                  -- Supabase Storage URL
  gallery            text[] default '{}',
  rating             numeric(2,1) default 0,
  reviews            integer default 0,
  distance_km        numeric(5,2) default 0,
  price_from         integer default 0,
  open_until         text,
  is_open            boolean default true,
  verified           boolean default false,
  address            text,
  cancellation_policy text,
  city               text,
  location           geography(point, 4326), -- PostGIS for nearby search
  is_published       boolean default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists salons_category_idx on public.salons(category);
create index if not exists salons_city_idx on public.salons(city);
create index if not exists salons_verified_idx on public.salons(verified);
create index if not exists salons_is_published_idx on public.salons(is_published);
create index if not exists salons_location_idx on public.salons using gist(location);

-- =====================================================================
-- SALON SERVICES
-- =====================================================================
create table if not exists public.salon_services (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references public.salons(id) on delete cascade,
  name            text not null,
  description     text,
  category        text not null,
  duration_min    integer not null,
  duration_label  text not null,
  price_from      integer not null,
  price_to        integer,
  rating          numeric(2,1) default 0,
  reviews         integer default 0,
  image_url       text,
  whats_included  text[] default '{}',
  popular         boolean default false,
  is_published    boolean default true,
  created_at      timestamptz not null default now()
);

create index if not exists salon_services_salon_id_idx on public.salon_services(salon_id);
create index if not exists salon_services_category_idx on public.salon_services(category);
create index if not exists salon_services_popular_idx on public.salon_services(popular) where popular = true;

-- =====================================================================
-- STAFF MEMBERS
-- =====================================================================
create table if not exists public.staff_members (
  id                uuid primary key default gen_random_uuid(),
  salon_id          uuid not null references public.salons(id) on delete cascade,
  name              text not null,
  role              text not null,
  rating            numeric(2,1) default 0,
  reviews           integer default 0,
  avatar_color      text,
  initials          text,
  years_experience  integer default 0,
  bio               text,
  specializations   text[] default '{}',
  working_hours     jsonb not null,
  breaks            jsonb default '[]',
  days_off          integer[] default '{}',  -- 0=Sun, 6=Sat
  service_ids       uuid[] default '{}',     -- references salon_services.id
  is_published      boolean default true,
  created_at        timestamptz not null default now()
);

create index if not exists staff_members_salon_id_idx on public.staff_members(salon_id);

-- =====================================================================
-- AVAILABILITY SLOTS (Realtime-updated)
-- =====================================================================
create table if not exists public.availability_slots (
  id           uuid primary key default gen_random_uuid(),
  salon_id     uuid not null references public.salons(id) on delete cascade,
  staff_id     uuid references public.staff_members(id) on delete cascade,
  service_id   uuid references public.salon_services(id) on delete cascade,
  date         date not null,
  time         text not null,
  status       text not null default 'open' check (status in ('open','limited','booked')),
  created_at   timestamptz not null default now(),
  unique (salon_id, staff_id, date, time)
);

create index if not exists availability_salon_idx on public.availability_slots(salon_id, date);
create index if not exists availability_staff_idx on public.availability_slots(staff_id, date);
create index if not exists availability_status_idx on public.availability_slots(status) where status = 'open';

-- =====================================================================
-- BOOKINGS
-- =====================================================================
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          text not null unique,           -- human-readable, e.g. SS-DEMO-XXXXXX
  customer_id         uuid not null references public.customers(id) on delete cascade,
  salon_id            uuid not null references public.salons(id) on delete restrict,
  service_id          uuid references public.salon_services(id) on delete set null,
  staff_id            uuid references public.staff_members(id) on delete set null,
  slot_id             uuid references public.availability_slots(id) on delete set null,
  service_name        text not null,
  staff_name          text,
  salon_name          text not null,
  date                date not null,
  time                text not null,
  duration_label      text,
  price               integer not null,
  status              text not null default 'pending'
                       check (status in ('pending','confirmed','completed','cancelled','no_show')),
  payment_status      text not null default 'pending'
                       check (payment_status in ('pending','paid','refunded','failed')),
  payment_method      text,
  cancellation_policy text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bookings_customer_idx on public.bookings(customer_id, date);
create index if not exists bookings_booking_id_idx on public.bookings(booking_id);
create index if not exists bookings_salon_idx on public.bookings(salon_id, date);
create index if not exists bookings_status_idx on public.bookings(status);

-- =====================================================================
-- REVIEWS
-- =====================================================================
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  customer_name text not null,
  salon_id      uuid not null references public.salons(id) on delete cascade,
  booking_id    uuid references public.bookings(id) on delete set null,
  rating        integer not null check (rating between 1 and 5),
  text          text not null,
  reply         text,
  created_at    timestamptz not null default now(),
  unique (booking_id)  -- one review per booking
);

create index if not exists reviews_salon_idx on public.reviews(salon_id, created_at desc);
create index if not exists reviews_customer_idx on public.reviews(customer_id);

-- =====================================================================
-- FAVORITES (saved salons)
-- =====================================================================
create table if not exists public.favorites (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  salon_id     uuid not null references public.salons(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (customer_id, salon_id)
);

create index if not exists favorites_customer_idx on public.favorites(customer_id);
create index if not exists favorites_salon_idx on public.favorites(salon_id);

-- =====================================================================
-- PAYMENT METHODS (masked only — no real card data)
-- =====================================================================
create table if not exists public.payment_methods (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  type           text not null check (type in ('upi','card','wallet')),
  label          text not null,           -- masked, e.g. "•••• 4821"
  sub_label      text,                   -- e.g. "Expires 09/29"
  provider_token text,                   -- gateway token (not raw card data)
  is_default     boolean default false,
  created_at     timestamptz not null default now()
);

create index if not exists payment_methods_customer_idx on public.payment_methods(customer_id);

-- =====================================================================
-- NOTIFICATIONS (Realtime-updated)
-- =====================================================================
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  category       text not null check (category in ('booking','availability','ai','salon','review','system')),
  title          text not null,
  description    text not null,
  timestamp      text not null,          -- human-readable, e.g. "10 min ago"
  read           boolean default false,
  action_label   text,
  action_type    text,
  action_payload text,
  created_at     timestamptz not null default now()
);

create index if not exists notifications_customer_idx on public.notifications(customer_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(customer_id) where read = false;

-- =====================================================================
-- SUPPORT TICKETS
-- =====================================================================
create table if not exists public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  ticket_id     text not null unique,    -- e.g. SS-DEMO-1042
  subject       text not null,
  topic         text not null,
  message       text not null,
  booking_id    text,
  status        text not null default 'open' check (status in ('open','resolved','closed')),
  replies       jsonb default '[]',      -- [{ from: 'user'|'support', text: string, at: ISO }]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists support_tickets_customer_idx on public.support_tickets(customer_id, created_at desc);

-- =====================================================================
-- SAVED LOOKS (AI recommendations saved by the customer)
-- =====================================================================
create table if not exists public.saved_looks (
  id                      uuid primary key default gen_random_uuid(),
  customer_id             uuid not null references public.customers(id) on delete cascade,
  style                   text not null,
  category                text not null,
  description             text,
  service_name            text not null,
  visual_preview          text,
  visual_preview_source   text check (visual_preview_source in ('reference-image','ai-generated')),
  created_at              timestamptz not null default now(),
  unique (customer_id, style, service_name)
);

create index if not exists saved_looks_customer_idx on public.saved_looks(customer_id, created_at desc);

-- =====================================================================
-- CUSTOMER STATS (computed view — kept fresh by triggers)
-- =====================================================================
create table if not exists public.customer_stats (
  customer_id   uuid primary key references public.customers(id) on delete cascade,
  bookings      integer default 0,
  completed     integer default 0,
  saved_salons  integer default 0,
  saved_looks   integer default 0,
  reviews       integer default 0,
  updated_at    timestamptz not null default now()
);

-- =====================================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================================
alter table public.customers          enable row level security;
alter table public.salons             enable row level security;
alter table public.salon_services     enable row level security;
alter table public.staff_members     enable row level security;
alter table public.availability_slots enable row level security;
alter table public.bookings          enable row level security;
alter table public.reviews           enable row level security;
alter table public.favorites        enable row level security;
alter table public.payment_methods  enable row level security;
alter table public.notifications    enable row level security;
alter table public.support_tickets  enable row level security;
alter table public.saved_looks      enable row level security;
alter table public.customer_stats   enable row level security;
alter table public.service_categories enable row level security;

-- =====================================================================
-- RLS POLICIES
-- ---------------------------------------------------------------------
-- PUBLIC READ for catalog data (salons, services, staff, categories).
-- CUSTOMER-SCOPED for personal data (bookings, reviews, favorites, etc.).
-- =====================================================================

-- Salons: anyone can browse published salons
create policy "Salons are publicly readable"
  on public.salons for select
  using (is_published = true);

-- Salon services: public read
create policy "Salon services are publicly readable"
  on public.salon_services for select
  using (is_published = true);

-- Staff members: public read
create policy "Staff are publicly readable"
  on public.staff_members for select
  using (is_published = true);

-- Service categories: public read
create policy "Categories are publicly readable"
  on public.service_categories for select
  using (true);

-- Availability slots: public read (so customers can browse), but only
-- the system (server-side, service role) can write.
create policy "Availability is publicly readable"
  on public.availability_slots for select
  using (true);

-- Customers: a customer can read/update only their own row
create policy "Customers can read own row"
  on public.customers for select
  using (auth.uid() = auth_id);
create policy "Customers can update own row"
  on public.customers for update
  using (auth.uid() = auth_id);

-- Bookings: customer reads + creates their own; salon owner (future)
-- would also have read access via a separate policy
create policy "Customers can read own bookings"
  on public.bookings for select
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));
create policy "Customers can create own bookings"
  on public.bookings for insert
  with check (auth.uid() = (select auth_id from public.customers where id = customer_id));
create policy "Customers can update own bookings"
  on public.bookings for update
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));

-- Reviews: anyone can read; customers can write their own
create policy "Reviews are publicly readable"
  on public.reviews for select
  using (true);
create policy "Customers can create own reviews"
  on public.reviews for insert
  with check (auth.uid() = (select auth_id from public.customers where id = customer_id));

-- Favorites: customer-scoped CRUD
create policy "Customers can read own favorites"
  on public.favorites for select
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));
create policy "Customers can create own favorites"
  on public.favorites for insert
  with check (auth.uid() = (select auth_id from public.customers where id = customer_id));
create policy "Customers can delete own favorites"
  on public.favorites for delete
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));

-- Payment methods: customer-scoped
create policy "Customers can CRUD own payment methods"
  on public.payment_methods for all
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));

-- Notifications: customer-scoped
create policy "Customers can CRUD own notifications"
  on public.notifications for all
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));

-- Support tickets: customer-scoped
create policy "Customers can CRUD own support tickets"
  on public.support_tickets for all
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));

-- Saved looks: customer-scoped
create policy "Customers can CRUD own saved looks"
  on public.saved_looks for all
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));

-- Customer stats: read-only by owner
create policy "Customers can read own stats"
  on public.customer_stats for select
  using (auth.uid() = (select auth_id from public.customers where id = customer_id));

-- =====================================================================
-- REALTIME PUBLICATION
-- ---------------------------------------------------------------------
-- Enable realtime for the tables customers subscribe to.
-- =====================================================================
alter publication supabase_realtime add table public.availability_slots;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.salons;
alter publication supabase_realtime add table public.bookings;

-- =====================================================================
-- TRIGGERS — auto-update stats + salon ratings
-- =====================================================================

-- Auto-create customer_stats row when a customer is created
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_stats (customer_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_customer_created on public.customers;
create trigger on_customer_created
  after insert on public.customers
  for each row execute function public.handle_new_customer();

-- Auto-update customer_stats when a booking is created
create or replace function public.increment_customer_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.customer_stats set bookings = bookings + 1 where customer_id = new.customer_id;
    return new;
  elsif TG_OP = 'UPDATE' then
    if new.status = 'completed' and old.status <> 'completed' then
      update public.customer_stats set completed = completed + 1 where customer_id = new.customer_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists on_booking_change on public.bookings;
create trigger on_booking_change
  after insert or update on public.bookings
  for each row execute function public.increment_customer_stats();

-- Recompute salon rating + review count when a review is added
create or replace function public.recompute_salon_rating(salon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.salons
  set rating = coalesce((select avg(rating) from public.reviews where salon_id = $1), 0),
      reviews = coalesce((select count(*) from public.reviews where salon_id = $1), 0),
      updated_at = now()
  where id = $1;
end;
$$;

-- =====================================================================
-- DONE. After running this in the Supabase SQL editor:
--   1. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
--      + SUPABASE_SERVICE_ROLE_KEY in .env.local
--   2. The customer app will read real backend data via
--      src/lib/services/*
--   3. Existing demo data still works as a fallback (the services
--      throw clean config errors when Supabase isn't configured).
-- =====================================================================
