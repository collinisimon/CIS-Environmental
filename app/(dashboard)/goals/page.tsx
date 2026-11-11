"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMonthlyMileage } from "@/lib/use-monthly-mileage";

const goals = [
  ["Drive Less", "Reduce monthly driving mileage."],
];
type Goal = {
  goal_id: number;
  user_id: number;
  goal_name: string;
  goal_description: string;
  target_miles_per_month: number | null;
  start_date: string;
};
const columns = "goal_id, user_id, goal_name, goal_description, target_miles_per_month, start_date";

async function getUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Your session has expired. Please sign in again.");
  const { data: profile, error: profileError } = await supabase.from("users")
    .select("user_id").eq("auth_user_id", user.id).single();
  if (profileError || !profile) throw new Error("Unable to find your user profile. Please try again or contact support.");
  return profile.user_id as number;
}

async function getGoal(userId: number) {
  const { data, error } = await supabase.from("sustainability_goals").select(columns)
    .eq("user_id", userId).order("goal_id", { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  return data as Goal | null;
}

function MileageProgress({ target }: { target: number | null }) {
  const { statistic, loading, error, retry } = useMonthlyMileage();
  const miles = statistic?.average_monthly_miles;
  return (
    <section aria-labelledby="mileage-progress" aria-busy={loading} className="space-y-3 border-t pt-5">
      <h3 id="mileage-progress" className="font-semibold">Your driving mileage</h3>
      <div aria-live="polite">
        {loading ? <p className="text-gray-600">Loading monthly mileage...</p> : error ? (
          <div><p role="alert" className="text-red-600">{error}</p><button onClick={retry} className="text-green-700 underline">Try again</button></div>
        ) : miles == null || !statistic?.as_of ? (
          <p className="text-gray-600">Not enough odometer data. <Link href="/vehicles/odometer" className="text-green-700 underline">Add odometer readings</Link> on different dates to estimate monthly mileage.</p>
        ) : miles < 0 ? <p className="text-amber-800">Your odometer readings produce a negative estimate. Check your readings before comparing progress.</p> : (
          <div className="space-y-3">
            <p><span className="text-2xl font-bold text-green-700">{Math.round(miles).toLocaleString("en-US")}</span> estimated miles/month</p>
            <p className="text-sm text-gray-600">As of {new Date(`${statistic.as_of}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" })}. Uses the same average as your dashboard.</p>
            {target != null && target >= 0 ? <>
              <p>Target: {Number(target).toLocaleString("en-US")} miles/month</p>
              <progress aria-label="Monthly mileage compared with target" className="h-3 w-full accent-green-700" max={target > 0 ? target : 1} value={target > 0 ? Math.min(miles, target) : miles > 0 ? 1 : 0} />
              <p className={miles <= target ? "font-medium text-green-700" : "font-medium text-amber-800"}>
                {miles <= target ? "You’re meeting your mileage goal." : `You’re ${(miles - target).toLocaleString("en-US", { maximumFractionDigits: 1 })} miles/month above your target.`}
              </p>
              <p className="text-sm text-gray-600">The bar shows mileage used against your monthly limit. Lower mileage is better.</p>
            </> : <p>Edit your goal to add a monthly mileage target.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

export default function GoalsPage() {
  const [saved, setSaved] = useState<Goal | null>(null);
  const [selection, setSelection] = useState("");
  const [target, setTarget] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);

  function populate(goal: Goal | null) {
    setSelection(goal?.goal_name === "Drive Less" ? "Drive Less" : "");
    setTarget(goal?.target_miles_per_month != null ? String(goal.target_miles_per_month) : "");
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const goal = await getGoal(await getUserId());
        if (!active) return;
        setSaved(goal);
        populate(goal);
        setEditing(!goal);
      } catch {
        if (active) setLoadError("Unable to load your sustainability goal. Check your connection and try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setMessage("");
    const option = goals.find(([name]) => name === selection);
    const miles = Number(target);
    if (!option) { setError("Choose a sustainability goal."); return; }
    if (selection === "Drive Less" && (!target.trim() || !Number.isFinite(miles) || miles < 0)) {
      setError("Enter a valid monthly mileage target of zero or more."); return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      // Recheck ownership and existing rows at save time rather than trusting stale form state.
      const userId = await getUserId();
      const existing = await getGoal(userId);
      const today = new Date();
      const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const values = {
        user_id: userId,
        goal_name: selection,
        goal_description: option[1],
        target_miles_per_month: miles,
        start_date: existing?.start_date || startDate,
      };
      const query = existing
        ? supabase.from("sustainability_goals").update(values).eq("goal_id", existing.goal_id).eq("user_id", userId)
        : supabase.from("sustainability_goals").insert(values);
      const { data, error: saveError } = await query.select(columns).single();
      if (saveError) throw saveError;
      setSaved(data as Goal);
      populate(data as Goal);
      setEditing(false);
      setMessage("Your sustainability goal was saved successfully!");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your goal. Please try again. Your changes are still here.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <main aria-label="Sustainability Goals" className="p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div><h1 className="text-2xl font-bold">Sustainability Goals</h1><p className="mt-2 text-gray-600">Choose one change to build a more sustainable routine.</p></div>
        {loading ? <p role="status">Loading your sustainability goal...</p> : loadError ? (
          <div className="space-y-3 rounded-lg bg-white p-6 shadow"><p role="alert" className="text-red-600">{loadError}</p><button onClick={() => setRetry((value) => value + 1)} className="text-green-700 underline">Try again</button></div>
        ) : <>
          {message && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{message}</p>}
          {saved && <section className="max-w-xl space-y-4 rounded-lg bg-white p-6 shadow" aria-labelledby="saved-goal">
            <h2 id="saved-goal" className="text-lg font-semibold">Your saved goal</h2>
            <p className="text-xl font-bold text-green-700">{saved.goal_name}</p>
            <p className="break-words text-gray-600">{saved.goal_description}</p>
            {!editing && <button onClick={() => { populate(saved); setEditing(true); setMessage(""); }} className="rounded border border-green-700 px-4 py-2 text-green-700">Edit goal</button>}
            {saved.goal_name === "Drive Less" && <MileageProgress target={saved.target_miles_per_month} />}
          </section>}
          {editing && <section className="max-w-xl space-y-5 rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">{saved ? "Change your goal" : "Set your first goal"}</h2>
            <form onSubmit={save}>
              <fieldset disabled={saving} className="space-y-5">
                <label className="block"><span className="mb-2 block font-medium">Choose Your Sustainability Goal</span>
                  <select required value={selection} onChange={(event) => { setSelection(event.target.value); setError(""); }} aria-describedby={selection ? "goal-description" : undefined} className="w-full rounded border p-3">
                    <option value="">Select a goal</option>{goals.map(([name]) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                {selection && <p id="goal-description" className="text-gray-600">{goals.find(([name]) => name === selection)?.[1]}</p>}
                {selection === "Drive Less" && <label className="block"><span className="mb-2 block font-medium">Target Miles Per Month</span><input type="number" required min="0" step="any" value={target} onChange={(event) => setTarget(event.target.value)} className="w-full rounded border p-3" /><span className="mt-1 block text-sm text-gray-600">Your maximum monthly driving mileage. Zero is a valid target.</span></label>}
                {error && <p role="alert" className="text-red-600">{error}</p>}
                <div className="flex flex-wrap gap-3"><button type="submit" className="rounded bg-green-700 px-5 py-3 text-white disabled:opacity-50">{saving ? "Saving..." : "Save Goal"}</button>
                  {saved && <button type="button" onClick={() => { populate(saved); setEditing(false); setError(""); }} className="rounded border px-5 py-3">Cancel</button>}
                </div>
              </fieldset>
            </form>
            {selection === "Drive Less" && saved?.goal_name !== "Drive Less" && <MileageProgress target={null} />}
          </section>}
        </>}
      </div>
    </main>
  );
}
