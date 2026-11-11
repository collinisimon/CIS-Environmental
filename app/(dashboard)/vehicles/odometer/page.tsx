"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ODOMETER_READING_SAVED } from "@/lib/odometer-events";

type Vehicle = {
  vehicle_id: number;
  make: string;
  model: string;
  year: number;
  vin: string;
};

async function getOwnedVehicles() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("user_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Could not find your user profile.");
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select("vehicle_id, make, model, year, vin")
    .eq("user_id", profile.user_id)
    .order("vehicle_id", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Vehicle[];
}

export default function OdometerPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [readingDate, setReadingDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const ownedVehicles = await getOwnedVehicles();
        if (!active) return;
        if (!ownedVehicles) {
          router.replace("/login");
          return;
        }
        setVehicles(ownedVehicles);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load your vehicles.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();
    return () => { active = false; };
  }, [router]);

  async function saveReading(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setMessage("");

    const mileage = Number(odometer);
    if (!vehicleId || !readingDate || !odometer.trim() || !Number.isFinite(mileage) || mileage < 0) {
      setError("Select a vehicle, enter a nonnegative odometer reading, and choose a reading date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ownedVehicles = await getOwnedVehicles();
      if (!ownedVehicles) {
        router.replace("/login");
        return;
      }
      const vehicle = ownedVehicles.find((vehicle) => String(vehicle.vehicle_id) === vehicleId);
      if (!vehicle) {
        setError("This vehicle is no longer available. Please select one of your vehicles.");
        setVehicles(ownedVehicles);
        setVehicleId("");
        return;
      }

      const { error } = await supabase.from("vehicle_odometer_readings").insert({
        vehicle_id: vehicle.vehicle_id,
        odometer: mileage,
        reading_date: readingDate,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Odometer reading saved successfully!");
      window.dispatchEvent(new Event(ODOMETER_READING_SAVED));
      setOdometer("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save the reading. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) return <main className="p-10">Loading your vehicles...</main>;

  return (
    <main className="bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-xl space-y-6">
        <Link href="/vehicles" className="text-green-700 underline">Back to Vehicles</Link>
        <section className="space-y-6 rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Add Odometer Reading</h1>

          {vehicles.length > 0 ? (
            <form onSubmit={saveReading}>
              <fieldset disabled={isSubmitting} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm">Vehicle</span>
                  <select name="vehicle_id" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className="w-full rounded border p-3" required>
                    <option value="">Select your vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                        {vehicle.year} {vehicle.make} {vehicle.model} — VIN: {vehicle.vin}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Odometer reading</span>
                  <input name="odometer" type="number" min="0" step="any" value={odometer} onChange={(event) => setOdometer(event.target.value)} className="w-full rounded border p-3" required />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Reading date</span>
                  <input name="reading_date" type="date" value={readingDate} onChange={(event) => setReadingDate(event.target.value)} className="w-full rounded border p-3" required />
                </label>
                <button type="submit" className="w-full rounded bg-green-700 p-3 text-white disabled:opacity-50" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Reading"}
                </button>
              </fieldset>
            </form>
          ) : !error && (
            <p>You haven&apos;t added any vehicles yet. <Link href="/vehicles" className="text-green-700 underline">Add a vehicle on the vehicles page</Link> to record a reading.</p>
          )}

          {error && <p role="alert" className="text-red-600">{error}</p>}
          {message && <p role="status" className="text-green-700">{message}</p>}
        </section>
      </div>
    </main>
  );
}
