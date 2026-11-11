-- Run this entire file in the Supabase SQL Editor.
-- Existing code writes mileage to public.vehicle_odometer_readings.odometer.
-- SECURITY INVOKER preserves the caller's table privileges and RLS policies.
-- Authenticated users need SELECT access and appropriate ownership SELECT
-- policies on users, vehicles, and vehicle_odometer_readings. No policies or
-- vehicle/reading records are modified by this migration.
begin;

create or replace function public.get_average_monthly_miles()
returns table (average_monthly_miles numeric, as_of date)
language sql
stable
security invoker
set search_path = ''
set row_security = on
as $$
  with owned_vehicles as (
    select v.vehicle_id, v.purchase_date
    from public.vehicles v
    where exists (
      select 1
      from public.users u
      where u.user_id = v.user_id
        and u.auth_user_id = (select auth.uid())
    )
  ), valid_readings as (
    select r.vehicle_id, r.reading_id, r.reading_date::date as reading_date,
           r.odometer::numeric as odometer
    from public.vehicle_odometer_readings r
    join owned_vehicles v on v.vehicle_id = r.vehicle_id
    where r.reading_date::date >= v.purchase_date::date
      and r.odometer is not null
  ), ranked_readings as (
    select *,
      row_number() over (
        partition by vehicle_id order by reading_date, reading_id
      ) as earliest,
      row_number() over (
        partition by vehicle_id order by reading_date desc, reading_id desc
      ) as latest
    from valid_readings
  ), vehicle_endpoints as (
    select vehicle_id,
      count(*) as reading_count,
      max(odometer) filter (where earliest = 1) as first_odometer,
      max(odometer) filter (where latest = 1) as last_odometer,
      min(reading_date) as first_date,
      max(reading_date) as last_date
    from ranked_readings
    group by vehicle_id
  ), vehicle_rates as (
    select (last_odometer - first_odometer)
             / (nullif(last_date - first_date, 0)::numeric / 30.4375)
             as monthly_miles,
           last_date
    from vehicle_endpoints
    where reading_count >= 2 and last_date > first_date
  )
  -- SUM returns NULL when no vehicles qualify; zero mileage remains valid.
  select sum(monthly_miles), max(last_date)
  from vehicle_rates;
$$;

revoke all on function public.get_average_monthly_miles() from public, anon;
grant execute on function public.get_average_monthly_miles() to authenticated;

commit;
