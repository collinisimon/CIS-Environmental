"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const tabs = [
  { href: "/", label: "Dashboard" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/goals", label: "Goals" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error || !user) {
          router.replace("/login");
          return;
        }
        setAuthenticated(true);
      } catch {
        if (active) setError("Unable to check your session. Please reload to try again.");
      }
    }
    void checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthenticated(false);
        router.replace("/login");
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function signOut() {
    setError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
    }
  }

  if (!authenticated) {
    return <main className="p-10">{error ? <p role="alert">{error}</p> : "Loading..."}</main>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white px-8 pt-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
            <h1 className="text-3xl font-bold">CIS Environmental</h1>
            <button onClick={signOut} className="rounded bg-gray-800 px-4 py-2 text-white">Sign Out</button>
          </div>
          <nav aria-label="Main navigation" className="flex gap-6">
            {tabs.map((tab) => {
              const active = tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}
                  className={`border-b-2 px-2 pb-3 font-medium ${active ? "border-green-700 text-green-700" : "border-transparent text-gray-600 hover:text-green-700"}`}>
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {error && <p role="alert" className="py-3 text-red-600">{error}</p>}
        </div>
      </header>
      {children}
    </div>
  );
}
