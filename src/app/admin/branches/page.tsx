"use client";

import Link from "next/link";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";

export default function BranchesAdminPage() {
  const { restaurant, branches, loading, refresh } = useTenant();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [whatsappFrom, setWhatsappFrom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function createBranch(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const response = await fetch("/api/admin/branches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        city,
        twilioWhatsappFrom: whatsappFrom || undefined,
      }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to create branch");
      return;
    }
    setName("");
    setCity("");
    setWhatsappFrom("");
    setSaved(true);
    refresh();
  }

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Branches</h1>
          <p className="text-stone-600">
            {restaurant?.name} — locations, WhatsApp numbers, and branch menus
          </p>
        </div>
        <Link href="/admin/settings" className="text-sm text-amber-700 underline">
          Settings
        </Link>
      </div>

      <section className="mb-8 space-y-3">
        {branches.map((branch) => (
          <article key={branch.id} className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-stone-900">{branch.name}</h2>
                <p className="text-sm text-stone-500">
                  {branch.slug}
                  {branch.city ? ` · ${branch.city}` : ""}
                  {branch.isDefault ? " · default" : ""}
                </p>
                {branch.twilioWhatsappFrom ? (
                  <p className="text-xs text-stone-500">{branch.twilioWhatsappFrom}</p>
                ) : null}
              </div>
              <Link
                href={`/admin/branches/${branch.slug}/menu`}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium"
              >
                Branch menu
              </Link>
            </div>
          </article>
        ))}
      </section>

      <form onSubmit={createBranch} className="space-y-4 rounded-2xl border bg-white p-6">
        <h2 className="font-semibold">Add branch</h2>
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Branch name (e.g. Lahore DHA)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
          placeholder="WhatsApp sender whatsapp:+..."
          value={whatsappFrom}
          onChange={(e) => setWhatsappFrom(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-700">Branch created.</p> : null}
        <button type="submit" className="rounded-xl bg-stone-900 px-4 py-2 text-white">
          Create branch
        </button>
      </form>
    </main>
  );
}
