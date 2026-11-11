"use client";

import { useMonthlyMileage } from "@/lib/use-monthly-mileage";

export default function DashboardPage() {
  const { statistic, loading, error, retry } = useMonthlyMileage();

  const hasData = statistic?.average_monthly_miles != null && statistic.as_of != null;

  return (
    <main aria-label="Dashboard" className="p-8">
      <div className="mx-auto max-w-4xl">
        <section aria-labelledby="monthly-mileage-title" aria-busy={loading} className="max-w-md space-y-3 rounded-lg bg-white p-6 shadow">
          <h2 id="monthly-mileage-title" className="text-lg font-semibold">Average Monthly Miles Driven</h2>
          <div aria-live="polite">
            {loading ? (
              <p className="text-gray-600">Loading monthly mileage...</p>
            ) : error ? (
              <div className="space-y-2">
                <p role="alert" className="text-red-600">{error}</p>
                <button onClick={retry} className="text-green-700 underline">Try again</button>
              </div>
            ) : hasData ? (
              <>
                <p className="text-3xl font-bold text-green-700">
                  {Math.round(statistic.average_monthly_miles!).toLocaleString("en-US")} <span className="text-lg font-normal">miles/month</span>
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  As of {new Date(`${statistic.as_of}T00:00:00Z`).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
                  })}
                </p>
              </>
            ) : (
              <p className="text-gray-600">Not enough odometer data</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
