"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ restaurantName, email, password }),
      });
      const data = (await response.json()) as {
        error?: string;
        restaurant?: { slug: string };
      };
      if (!response.ok) {
        setError(data.error ?? "Signup failed");
        return;
      }
      const slug = data.restaurant?.slug;
      if (slug && typeof window !== "undefined") {
        const host = window.location.host;
        const isLocal = host.includes("localhost");
        if (isLocal) {
          router.push(`/dashboard?tenant=${slug}`);
        } else {
          const platformHost = process.env.NEXT_PUBLIC_PLATFORM_HOST ?? host;
          window.location.href = `https://${slug}.${platformHost}/dashboard`;
        }
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-stone-900">Start your free trial</h1>
      <p className="mb-8 text-stone-600">
        Create your restaurant workspace with WhatsApp ordering, counter dashboard, and kitchen display.
      </p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white p-6">
        <label className="block">
          <span className="mb-1 block text-sm text-stone-600">Restaurant name</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={restaurantName}
            onChange={(event) => setRestaurantName(event.target.value)}
            placeholder="Ali's Cafe"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-stone-600">Owner email</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-stone-600">Password (min 8 chars)</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create restaurant"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-amber-700 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
