# Average monthly miles

Run `migrations/202611050001_average_monthly_miles.sql` in your project's
Supabase SQL Editor before using the Dashboard card. It creates
`public.get_average_monthly_miles()`; the frontend calls it without arguments.
The migration does not change existing records or RLS policies.

The existing odometer form writes the mileage column as `odometer`. No database
schema export is included in this repository. To verify your live schema first:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vehicle_odometer_readings'
order by ordinal_position;
```

The function uses `auth.uid()` and explicit ownership checks. It runs as the
caller (`SECURITY INVOKER`), so authenticated users must already have SELECT
privileges and ownership-based SELECT policies for `users`, `vehicles`, and
`vehicle_odometer_readings`. RLS remains in effect. Test the card while signed
in to the app; SQL Editor calls without an authenticated JWT return null totals.

Readings before purchase, missing dates/mileage, and vehicles without a known
purchase date do not qualify. For each vehicle, only the first and last valid
readings are used, with `reading_id` breaking same-day ties deterministically.
Vehicles need at least two readings on different dates. The result sums each
qualifying vehicle's `(last - first) * 30.4375 / elapsed_days` and reports the
latest endpoint date among qualifying vehicles. Zero miles is a valid result;
no qualifying vehicles returns null. Decreasing odometer readings are not
silently corrected and contribute a negative rate under the requested formula.

The card refreshes on Dashboard entry, after a successful odometer submission,
and when returning to the browser tab. It displays RPC failures separately from
insufficient readings.

Suggested live checks:

- Readings of 10,000 and 11,000 miles 30 days apart produce 1,015 miles/month.
- A second vehicle with the same readings makes the total 2,029 miles/month
  (the sum is rounded only for display).
- A pre-purchase reading does not affect the result.
- One reading or multiple readings on a single date produce insufficient data.
- Equal mileage on two different dates displays 0 miles/month.
- Another user's vehicles never affect the total or its "As of" date.
- Saving a new reading updates the card when returning to Dashboard.
