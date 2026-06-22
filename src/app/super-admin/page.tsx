"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Restaurant } from "@/lib/types";

export default function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/super-admin/restaurants");
      if (!response.ok) {
        setError("Failed to load restaurants");
        return;
      }
      const data = (await response.json()) as { restaurants: Restaurant[] };
      setRestaurants(data.restaurants);
    }
    void load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Platform admin</h1>
          <p className="text-stone-600">All restaurants on this deployment</p>
        </div>
        <Link href="/signup" className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white">
          New restaurant
        </Link>
      </div>
      {error ? <p className="text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {restaurants.map((restaurant) => (
          <article key={restaurant.id} className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-stone-900">{restaurant.name}</h2>
                <p className="text-sm text-stone-500">
                  {restaurant.slug} · {restaurant.status} · {restaurant.plan}
                </p>
              </div>
              <a
                href={`/dashboard?tenant=${restaurant.slug}`}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium"
              >
                Open dashboard
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
