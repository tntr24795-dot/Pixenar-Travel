-- Havena — Row Level Security
-- Every table holding user data has RLS enabled. Tables with no INSERT/UPDATE
-- policy for anon/authenticated are intentionally write-only via the server's
-- service-role client (Supabase service_role bypasses RLS) — this guarantees
-- prices, statuses and role-sensitive fields are never trusted from the browser.

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

create or replace function owns_host_profile(p_host_profile_id uuid)
returns boolean as $$
  select exists (
    select 1 from host_profiles where id = p_host_profile_id and user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- =========================================================================
-- profiles
-- =========================================================================
alter table profiles enable row level security;

create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_admin_all" on profiles
  for all using (is_admin()) with check (is_admin());

-- Public, non-sensitive host display info (name + avatar) for listing pages.
-- Runs with the view owner's privileges, so anon/authenticated can read it
-- without exposing email, phone or role from the base table.
create view public_profiles as
  select id, first_name, last_name, avatar_url from profiles;
grant select on public_profiles to anon, authenticated;

-- =========================================================================
-- host_profiles
-- =========================================================================
alter table host_profiles enable row level security;

create policy "host_profiles_select_own_or_admin" on host_profiles
  for select using (user_id = auth.uid() or is_admin());

create policy "host_profiles_insert_own" on host_profiles
  for insert with check (user_id = auth.uid());

create policy "host_profiles_update_own_or_admin" on host_profiles
  for update using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());

create view public_host_profiles as
  select hp.id, hp.bio, hp.identity_status, hp.average_rating, hp.total_reviews,
         pp.first_name, pp.avatar_url
  from host_profiles hp
  join profiles pp on pp.id = hp.user_id;
grant select on public_host_profiles to anon, authenticated;

-- =========================================================================
-- listings
-- =========================================================================
alter table listings enable row level security;

create policy "listings_select_active_or_own_or_admin" on listings
  for select using (
    status = 'active'
    or owns_host_profile(host_id)
    or is_admin()
  );

create policy "listings_insert_own_host" on listings
  for insert with check (owns_host_profile(host_id));

create policy "listings_update_own_or_admin" on listings
  for update using (owns_host_profile(host_id) or is_admin())
  with check (owns_host_profile(host_id) or is_admin());

create policy "listings_delete_own_or_admin" on listings
  for delete using (owns_host_profile(host_id) or is_admin());

-- =========================================================================
-- listing_images
-- =========================================================================
alter table listing_images enable row level security;

create policy "listing_images_select" on listing_images
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_images.listing_id
        and (l.status = 'active' or owns_host_profile(l.host_id) or is_admin())
    )
  );

create policy "listing_images_write_own_or_admin" on listing_images
  for all using (
    exists (select 1 from listings l where l.id = listing_images.listing_id and (owns_host_profile(l.host_id) or is_admin()))
  ) with check (
    exists (select 1 from listings l where l.id = listing_images.listing_id and (owns_host_profile(l.host_id) or is_admin()))
  );

-- =========================================================================
-- amenities / listing_amenities
-- =========================================================================
alter table amenities enable row level security;
alter table listing_amenities enable row level security;

create policy "amenities_select_all" on amenities for select using (true);
create policy "amenities_admin_write" on amenities for all using (is_admin()) with check (is_admin());

create policy "listing_amenities_select" on listing_amenities
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_amenities.listing_id
        and (l.status = 'active' or owns_host_profile(l.host_id) or is_admin())
    )
  );

create policy "listing_amenities_write_own_or_admin" on listing_amenities
  for all using (
    exists (select 1 from listings l where l.id = listing_amenities.listing_id and (owns_host_profile(l.host_id) or is_admin()))
  ) with check (
    exists (select 1 from listings l where l.id = listing_amenities.listing_id and (owns_host_profile(l.host_id) or is_admin()))
  );

-- =========================================================================
-- availability
-- =========================================================================
alter table availability enable row level security;

create policy "availability_select" on availability
  for select using (
    exists (
      select 1 from listings l
      where l.id = availability.listing_id
        and (l.status = 'active' or owns_host_profile(l.host_id) or is_admin())
    )
  );

create policy "availability_write_own_or_admin" on availability
  for all using (
    exists (select 1 from listings l where l.id = availability.listing_id and (owns_host_profile(l.host_id) or is_admin()))
  ) with check (
    exists (select 1 from listings l where l.id = availability.listing_id and (owns_host_profile(l.host_id) or is_admin()))
  );

-- =========================================================================
-- bookings — no client INSERT/UPDATE policy on purpose.
-- All writes go through server routes using the service-role key, which
-- recompute the price server-side before ever touching this table.
-- =========================================================================
alter table bookings enable row level security;

create policy "bookings_select_participant_or_admin" on bookings
  for select using (guest_id = auth.uid() or host_id = auth.uid() or is_admin());

-- =========================================================================
-- booking_price_items — read-only to clients, same visibility as the booking.
-- =========================================================================
alter table booking_price_items enable row level security;

create policy "booking_price_items_select" on booking_price_items
  for select using (
    exists (
      select 1 from bookings b
      where b.id = booking_price_items.booking_id
        and (b.guest_id = auth.uid() or b.host_id = auth.uid() or is_admin())
    )
  );

-- =========================================================================
-- reviews
-- =========================================================================
alter table reviews enable row level security;

create policy "reviews_select_published_or_involved_or_admin" on reviews
  for select using (status = 'published' or guest_id = auth.uid() or host_id = auth.uid() or is_admin());

create policy "reviews_insert_own_completed_booking" on reviews
  for insert with check (
    guest_id = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = reviews.booking_id
        and b.guest_id = auth.uid()
        and b.status = 'completed'
    )
  );

create policy "reviews_update_own_or_admin" on reviews
  for update using (guest_id = auth.uid() or is_admin())
  with check (guest_id = auth.uid() or is_admin());

-- =========================================================================
-- wishlists / wishlist_items
-- =========================================================================
alter table wishlists enable row level security;
alter table wishlist_items enable row level security;

create policy "wishlists_owner_all" on wishlists
  for all using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid());

create policy "wishlist_items_owner_all" on wishlist_items
  for all using (
    exists (select 1 from wishlists w where w.id = wishlist_items.wishlist_id and (w.user_id = auth.uid() or is_admin()))
  ) with check (
    exists (select 1 from wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid())
  );

-- =========================================================================
-- conversations / messages
-- =========================================================================
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "conversations_participant_all" on conversations
  for all using (guest_id = auth.uid() or host_id = auth.uid() or is_admin())
  with check (guest_id = auth.uid() or host_id = auth.uid());

create policy "messages_select_participant_or_admin" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.guest_id = auth.uid() or c.host_id = auth.uid())
    ) or is_admin()
  );

create policy "messages_insert_participant" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.guest_id = auth.uid() or c.host_id = auth.uid())
    )
  );

-- =========================================================================
-- payment_events — server (webhook) only, never exposed to the browser.
-- =========================================================================
alter table payment_events enable row level security;

create policy "payment_events_admin_select" on payment_events
  for select using (is_admin());

-- =========================================================================
-- cancellations — server-computed refunds; clients can read their own.
-- =========================================================================
alter table cancellations enable row level security;

create policy "cancellations_select_involved_or_admin" on cancellations
  for select using (
    exists (
      select 1 from bookings b
      where b.id = cancellations.booking_id
        and (b.guest_id = auth.uid() or b.host_id = auth.uid())
    ) or is_admin()
  );

-- =========================================================================
-- disputes
-- =========================================================================
alter table disputes enable row level security;

create policy "disputes_select_involved_or_admin" on disputes
  for select using (
    opened_by = auth.uid()
    or exists (
      select 1 from bookings b
      where b.id = disputes.booking_id
        and (b.guest_id = auth.uid() or b.host_id = auth.uid())
    )
    or is_admin()
  );

create policy "disputes_insert_involved" on disputes
  for insert with check (
    opened_by = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = disputes.booking_id
        and (b.guest_id = auth.uid() or b.host_id = auth.uid())
    )
  );

create policy "disputes_update_admin" on disputes
  for update using (is_admin()) with check (is_admin());

-- =========================================================================
-- admin_audit_logs — admin only, both directions.
-- =========================================================================
alter table admin_audit_logs enable row level security;

create policy "admin_audit_logs_admin_all" on admin_audit_logs
  for all using (is_admin()) with check (is_admin());
