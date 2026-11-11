"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ODOMETER_READING_SAVED } from "@/lib/odometer-events";

type MileageStatistic = {
  average_monthly_miles: number | null;
  as_of: string | null;
};

export function useMonthlyMileage(enabled = true) {
  const pathname = usePathname();
  const [statistic, setStatistic] = useState<MileageStatistic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let request = 0;

    async function loadStatistic() {
      const currentRequest = ++request;
      setLoading(true);
      setError("");
      try {
        const { data, error } = await supabase.rpc("get_average_monthly_miles").single<MileageStatistic>();
        if (!active || currentRequest !== request) return;
        if (error) throw error;
        setStatistic(data);
      } catch {
        if (active && currentRequest === request) {
          setError("Unable to load monthly mileage. Please try again.");
        }
      } finally {
        if (active && currentRequest === request) setLoading(false);
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void loadStatistic();
    }

    void loadStatistic();
    window.addEventListener(ODOMETER_READING_SAVED, loadStatistic);
    window.addEventListener("focus", loadStatistic);
    window.addEventListener("pageshow", loadStatistic);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.removeEventListener(ODOMETER_READING_SAVED, loadStatistic);
      window.removeEventListener("focus", loadStatistic);
      window.removeEventListener("pageshow", loadStatistic);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [enabled, pathname, retry]);

  return { statistic, loading, error, retry: () => setRetry((value) => value + 1) };
}
