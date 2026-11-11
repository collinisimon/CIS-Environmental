"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  if (isSubmitting) return;

  setError("");
  setMessage("");

  if (isSignUp && (!firstName.trim() || !lastName.trim())) {
    setError("Please enter your first and last name.");
    return;
  }

  setIsSubmitting(true);

  try {
    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setMessage(
          "Account created, but automatic sign-in is unavailable. Check that email confirmation is disabled in Supabase."
        );
        return;
      }
    } else {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }
    }

    router.replace("/");
    router.refresh();
  } catch {
    setError("Unable to connect. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900">
      <form onSubmit={handleSubmit} className="w-80 space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">
          CIS Environmental {isSignUp ? "Create Account" : "Login"}
        </h1>

        {isSignUp && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm">First name</span>
              <input
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded border p-2"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">Last name</span>
              <input
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded border p-2"
                required
              />
            </label>
          </>
        )}

        <input
          type="email"
          name="email"
          aria-label="Email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border p-2"
          required
        />

        <input
          type="password"
          name="password"
          aria-label="Password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border p-2"
          required
        />

        <button type="submit" disabled={isSubmitting} className="w-full rounded bg-green-700 p-2 text-white disabled:opacity-50">
          {isSubmitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setMessage("");
            setPassword("");
          }}
          className="w-full text-sm text-green-700 underline disabled:opacity-50"
        >
          {isSignUp ? "Already have an account? Sign In" : "Need an account? Create Account"}
        </button>

        {error && <p role="alert" className="text-red-600">{error}</p>}
        {message && <p role="status" className="text-green-700">{message}</p>}
      </form>
    </main>
  );
}
