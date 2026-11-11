"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  vehicle_id: number;
  make: string;
  model: string;
  year: number;
  vin: string;
  purchase_date: string;
};

export default function VehiclesPage() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("vehicle_id, make, model, year, vin, purchase_date")
      .order("vehicle_id", { ascending: false });

    if (error) setMessage(error.message);
    else setVehicles(data ?? []);
  }

  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      await loadVehicles();
      setLoading(false);
    }

    void initialize();
  }, [router]);

  async function addVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("user_id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile) {
      setMessage("Could not find your user profile.");
      return;
    }

    const { error } = await supabase.from("vehicles").insert({
      user_id: profile.user_id,
      make: make.trim(),
      model: model.trim(),
      year: Number(year),
      vin: vin.trim().toUpperCase(),
      purchase_date: purchaseDate,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Vehicle added successfully!");
    setMake("");
    setModel("");
    setYear("");
    setVin("");
    setPurchaseDate("");

    await loadVehicles();
  }

  if (loading) {
    return <main className="p-10">Loading...</main>;
  }

  return (
    <main className="bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-4xl space-y-8">
        <nav aria-label="Vehicle tools">
          <Link href="/vehicles/odometer" className="inline-block rounded bg-green-700 px-4 py-2 text-white">
            Add Odometer Reading
          </Link>
        </nav>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">My Vehicles</h2>

          {vehicles.length === 0 ? (
            <p>You haven&apos;t added any vehicles yet.</p>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div key={vehicle.vehicle_id} className="rounded border p-4">
                  <p className="font-semibold">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-sm text-gray-600">
                    VIN: {vehicle.vin}
                  </p>
                  <p className="text-sm text-gray-600">
                    Purchased: {vehicle.purchase_date}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Add a Vehicle</h2>

          <form onSubmit={addVehicle} className="grid gap-4 sm:grid-cols-2">
            <input className="rounded border p-3" placeholder="Make (Toyota)" value={make}
              onChange={(e) => setMake(e.target.value)} required />
            <input className="rounded border p-3" placeholder="Model (Camry)" value={model}
              onChange={(e) => setModel(e.target.value)} required />
            <input className="rounded border p-3" placeholder="Year" type="number" min="1886"
              max={new Date().getFullYear() + 1} value={year}
              onChange={(e) => setYear(e.target.value)} required />
            <input className="rounded border p-3" placeholder="VIN" value={vin}
              onChange={(e) => setVin(e.target.value)} required />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm">Purchase Date</label>
              <input className="w-full rounded border p-3" type="date"
                value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </div>
            <button type="submit" className="rounded bg-green-700 p-3 text-white sm:col-span-2">
              Add Vehicle
            </button>
          </form>

          {message && <p className="mt-4 text-sm">{message}</p>}
        </section>
      </div>
    </main>
  );
}
