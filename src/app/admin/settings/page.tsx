"use client";

import Link from "next/link";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import type {
  Restaurant,
  RestaurantConfig,
  RestaurantPaymentConfig,
} from "@/lib/types";

function SettingsForm({
  restaurant,
  config,
}: {
  restaurant: Restaurant;
  config: RestaurantConfig;
}) {
  const [name, setName] = useState(restaurant.name);
  const [tagline, setTagline] = useState(restaurant.tagline);
  const [currency, setCurrency] = useState(restaurant.currency);
  const [deliveryFeeCents, setDeliveryFeeCents] = useState(restaurant.deliveryFeeCents);
  const [payment, setPayment] = useState<RestaurantPaymentConfig>({ ...config.payment });
  const [saved, setSaved] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        tagline,
        currency,
        deliveryFeeCents: Number(deliveryFeeCents),
        payment,
      }),
    });
    if (response.ok) setSaved(true);
  }

  async function startBilling() {
    setBillingLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      alert(data.error ?? "Billing is not configured");
    } finally {
      setBillingLoading(false);
    }
  }

  return (
    <>
      <p className="mb-6 text-sm text-stone-600">
        Plan: {restaurant.plan} · Status: {restaurant.status}
        {restaurant.status === "trial" ? (
          <button
            type="button"
            onClick={() => void startBilling()}
            disabled={billingLoading}
            className="ml-4 rounded-lg bg-emerald-700 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {billingLoading ? "Redirecting..." : "Upgrade with Stripe"}
          </button>
        ) : null}
      </p>
      <form onSubmit={save} className="space-y-4 rounded-2xl border bg-white p-6">
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Restaurant name"
          required
        />
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Tagline"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-lg border px-3 py-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="Currency"
          />
          <input
            className="rounded-lg border px-3 py-2"
            type="number"
            value={deliveryFeeCents}
            onChange={(e) => setDeliveryFeeCents(Number(e.target.value))}
            placeholder="Delivery fee (cents)"
          />
        </div>
        <h2 className="pt-2 font-semibold">Payment details</h2>
        {(
          [
            ["accountTitle", "Account title"],
            ["bankName", "Bank name"],
            ["accountNumber", "Account number"],
            ["iban", "IBAN"],
          ] as const
        ).map(([key, label]) => (
          <input
            key={key}
            className="w-full rounded-lg border px-3 py-2"
            value={payment[key]}
            onChange={(e) => setPayment({ ...payment, [key]: e.target.value })}
            placeholder={label}
          />
        ))}
        <textarea
          className="w-full rounded-lg border px-3 py-2"
          rows={2}
          value={payment.instructions}
          onChange={(e) => setPayment({ ...payment, instructions: e.target.value })}
          placeholder="Payment instructions"
        />
        <button type="submit" className="rounded-xl bg-stone-900 px-4 py-2 font-medium text-white">
          Save settings
        </button>
        {saved ? <p className="text-sm text-emerald-700">Saved.</p> : null}
      </form>
    </>
  );
}

export default function AdminSettingsPage() {
  const { restaurant, config, loading } = useTenant();

  if (loading) return <p className="p-8">Loading...</p>;
  if (!restaurant || !config) return <p className="p-8">Tenant not found.</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Restaurant settings</h1>
          <p className="text-stone-600">Branding and payment details for WhatsApp customers</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/branches" className="text-sm font-medium text-amber-700 underline">
            Branches
          </Link>
          <Link href="/admin/menu" className="text-sm font-medium text-amber-700 underline">
            Menu admin
          </Link>
          <Link href="/admin/twilio" className="text-sm font-medium text-amber-700 underline">
            Twilio setup
          </Link>
        </div>
      </div>
      <SettingsForm key={restaurant.id} restaurant={restaurant} config={config} />
    </main>
  );
}
