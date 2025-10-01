-- Persist time zone and structured address on business
alter table businesses
  add column if not exists time_zone_iana text,
  add column if not exists address_street_line1 text,
  add column if not exists address_street_line2 text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_postal_code text,
  add column if not exists address_country text default 'US';
