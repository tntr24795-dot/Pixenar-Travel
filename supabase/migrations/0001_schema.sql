-- Pixenar Travel — core schema
-- All monetary values are stored as integer cents. Never use floating point for money.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================================
-- profiles (1:1 with auth.users)
-- =========================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  role text not null default 'traveler' check (role in ('traveler','host','admin')),
  language text not null default 'en',
  timezone text not null default 'UTC',
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================================
-- host_profiles
-- =========================================================================
create table host_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  bio text,
  identity_status text not null default 'unverified' check (identity_status in ('unverified','pending','verified','rejected')),
  stripe_account_id text,
  stripe_onboarding_complete boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  average_rating numeric(3,2) not null default 0,
  total_reviews integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_host_profiles_updated_at before update on host_profiles
  for each row execute function set_updated_at();

-- =========================================================================
-- listings
-- =========================================================================
create table listings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references host_profiles(id) on delete cascade,
  title text not null,
  slug text unique not null,
  description text,
  property_type text not null default 'house'
    check (property_type in ('house','apartment','condo','cabin','villa','tiny_home','guesthouse','hotel_room','private_room')),
  room_type text not null default 'entire_place' check (room_type in ('entire_place','private_room','shared_room')),
  status text not null default 'draft'
    check (status in ('draft','pending_review','active','paused','rejected','suspended','archived')),
  country text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  maximum_guests integer not null default 1,
  bedrooms integer not null default 0,
  beds integer not null default 0,
  bathrooms numeric(3,1) not null default 0,
  base_price_cents integer not null default 0,
  weekend_price_cents integer,
  cleaning_fee_cents integer not null default 0,
  extra_guest_fee_cents integer not null default 0,
  pet_fee_cents integer not null default 0,
  security_deposit_cents integer not null default 0,
  weekly_discount_percent numeric(5,2) not null default 0,
  monthly_discount_percent numeric(5,2) not null default 0,
  currency text not null default 'USD',
  minimum_nights integer not null default 1,
  maximum_nights integer not null default 365,
  check_in_time time not null default '15:00',
  check_out_time time not null default '11:00',
  cancellation_policy text not null default 'moderate' check (cancellation_policy in ('flexible','moderate','strict')),
  instant_book boolean not null default false,
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_listings_status on listings(status);
create index idx_listings_city on listings(city);
create index idx_listings_host_id on listings(host_id);
create index idx_listings_geo on listings(latitude, longitude);

create trigger trg_listings_updated_at before update on listings
  for each row execute function set_updated_at();

-- =========================================================================
-- listing_images
-- =========================================================================
create table listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_listing_images_listing_id on listing_images(listing_id);

-- =========================================================================
-- amenities / listing_amenities
-- =========================================================================
create table amenities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text not null default 'general',
  icon text
);

create table listing_amenities (
  listing_id uuid not null references listings(id) on delete cascade,
  amenity_id uuid not null references amenities(id) on delete cascade,
  primary key (listing_id, amenity_id)
);

-- =========================================================================
-- bookings
-- =========================================================================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text unique not null,
  listing_id uuid not null references listings(id),
  guest_id uuid not null references profiles(id),
  host_id uuid not null references profiles(id),
  check_in date not null,
  check_out date not null,
  number_of_nights integer not null,
  adults integer not null default 1,
  children integer not null default 0,
  infants integer not null default 0,
  pets integer not null default 0,
  nightly_subtotal_cents integer not null default 0,
  cleaning_fee_cents integer not null default 0,
  guest_service_fee_cents integer not null default 0,
  host_service_fee_cents integer not null default 0,
  pet_fee_cents integer not null default 0,
  tax_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null default 0,
  host_payout_cents integer not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending_payment'
    check (status in ('pending_payment','confirmed','cancelled','expired','completed','refunded','partially_refunded','disputed')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded','partially_refunded','failed')),
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_transfer_id text,
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stay daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  constraint chk_dates check (check_out > check_in)
);

-- Prevent overlapping bookings for the same listing at the database level.
-- Any booking still holding or occupying a date range (pending_payment / confirmed)
-- collides with a new overlapping request — Postgres rejects the insert/update itself.
alter table bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    listing_id with =,
    stay with &&
  ) where (status in ('pending_payment','confirmed'));

create index idx_bookings_listing_id on bookings(listing_id);
create index idx_bookings_guest_id on bookings(guest_id);
create index idx_bookings_host_id on bookings(host_id);
create index idx_bookings_status on bookings(status);

create trigger trg_bookings_updated_at before update on bookings
  for each row execute function set_updated_at();

-- =========================================================================
-- booking_price_items — itemized fee/price breakdown, never store only a total
-- =========================================================================
create table booking_price_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  item_type text not null,
  description text not null,
  quantity integer not null default 1,
  unit_amount_cents integer not null,
  total_amount_cents integer not null,
  created_at timestamptz not null default now()
);

create index idx_booking_price_items_booking_id on booking_price_items(booking_id);

-- =========================================================================
-- availability
-- =========================================================================
create table availability (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  date date not null,
  status text not null default 'available' check (status in ('available','blocked','booked')),
  custom_price_cents integer,
  minimum_nights integer,
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, date)
);

create index idx_availability_listing_id_date on availability(listing_id, date);

create trigger trg_availability_updated_at before update on availability
  for each row execute function set_updated_at();

-- =========================================================================
-- reviews
-- =========================================================================
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  guest_id uuid not null references profiles(id),
  host_id uuid not null references profiles(id),
  rating_overall integer not null check (rating_overall between 1 and 5),
  rating_cleanliness integer check (rating_cleanliness between 1 and 5),
  rating_accuracy integer check (rating_accuracy between 1 and 5),
  rating_check_in integer check (rating_check_in between 1 and 5),
  rating_communication integer check (rating_communication between 1 and 5),
  rating_location integer check (rating_location between 1 and 5),
  rating_value integer check (rating_value between 1 and 5),
  comment text,
  host_reply text,
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reviews_listing_id on reviews(listing_id);
create index idx_reviews_host_id on reviews(host_id);

create trigger trg_reviews_updated_at before update on reviews
  for each row execute function set_updated_at();

-- =========================================================================
-- wishlists
-- =========================================================================
create table wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null default 'My Wishlist',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wishlist_items (
  wishlist_id uuid not null references wishlists(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wishlist_id, listing_id)
);

-- =========================================================================
-- conversations / messages
-- =========================================================================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  listing_id uuid not null references listings(id) on delete cascade,
  guest_id uuid not null references profiles(id),
  host_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation_id on messages(conversation_id);

-- =========================================================================
-- payment_events — Stripe webhook idempotency ledger
-- =========================================================================
create table payment_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  booking_id uuid references bookings(id),
  payload jsonb not null,
  processing_status text not null default 'pending' check (processing_status in ('pending','processed','failed','ignored')),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- cancellations
-- =========================================================================
create table cancellations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  cancelled_by uuid not null references profiles(id),
  reason text,
  policy_applied text not null,
  guest_refund_cents integer not null default 0,
  host_payout_cents integer not null default 0,
  platform_fee_retained_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- disputes
-- =========================================================================
create table disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  opened_by uuid not null references profiles(id),
  reason text not null,
  description text,
  status text not null default 'open' check (status in ('open','under_review','resolved','closed')),
  admin_notes text,
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- =========================================================================
-- admin_audit_logs
-- =========================================================================
create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
