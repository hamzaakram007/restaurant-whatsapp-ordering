"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTenant } from "@/components/TenantProvider";
import type { Branch, Restaurant } from "@/lib/types";

type SetupResponse = {
  ready: boolean;
  twilioConfigured: boolean;
  twilioMode: "platform" | "byo";
  whatsappFrom: string | null;
  database: boolean;
  publicAppUrl: string | null;
  publicAppUrlMatchesRequest: boolean;
  webhooks: { inbound: string; status: string };
  sandbox: { joinNumber: string; joinCommand: string; senderExample: string };
  checklist: { id: string; label: string; done: boolean }[];
};

function TwilioSettingsForm({
  branches,
  restaurant,
  setup,
}: {
  branches: Branch[];
  restaurant: Restaurant;
  setup: SetupResponse;
}) {
  const [twilioMode, setTwilioMode] = useState<"platform" | "byo">(setup.twilioMode);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [branchNumbers, setBranchNumbers] = useState<Record<string, string>>(() => {
    const numbers: Record<string, string> = {};
    for (const branch of branches) {
      numbers[branch.id] = branch.twilioWhatsappFrom ?? "";
    }
    return numbers;
  });
  const [centralNumber, setCentralNumber] = useState(restaurant.centralTwilioWhatsappFrom ?? "");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  async function saveTwilioSettings(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    setSaveError(null);

    const response = await fetch("/api/admin/twilio", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        twilioMode,
        twilioAccountSid: accountSid || undefined,
        twilioAuthToken: authToken || undefined,
        centralTwilioWhatsappFrom: centralNumber || undefined,
      }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setSaveError(data.error ?? "Failed to save account settings");
      return;
    }

    for (const branch of branches) {
      const number = branchNumbers[branch.id] ?? "";
      const previous = branch.twilioWhatsappFrom ?? "";
      if (number === previous) continue;
      const branchResponse = await fetch("/api/admin/twilio", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          branchId: branch.id,
          twilioWhatsappFrom: number || undefined,
        }),
      });
      if (!branchResponse.ok) {
        const data = (await branchResponse.json()) as { error?: string };
        setSaveError(data.error ?? `Failed to save ${branch.name}`);
        return;
      }
    }

    setSaved(true);
    setAuthToken("");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Twilio account</h2>
        <form onSubmit={saveTwilioSettings} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="twilioMode"
                checked={twilioMode === "platform"}
                onChange={() => setTwilioMode("platform")}
              />
              Platform (trial / demo)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="twilioMode"
                checked={twilioMode === "byo"}
                onChange={() => setTwilioMode("byo")}
              />
              Bring your own Twilio
            </label>
          </div>

          {twilioMode === "platform" ? (
            <p className="text-sm text-stone-600">
              Uses platform <code>TWILIO_ACCOUNT_SID</code> and <code>TWILIO_AUTH_TOKEN</code> from
              deployment env.
            </p>
          ) : (
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="Twilio Account SID (AC...)"
              />
              <input
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Auth token (leave blank to keep existing)"
              />
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="mb-3 font-medium text-stone-900">Per-branch WhatsApp numbers</h3>
            <p className="mb-3 text-sm text-stone-600">
              Inbound <strong>To</strong> routes to the matching branch. Each branch can have its own
              sender.
            </p>
            <div className="space-y-3">
              {branches.map((branch) => (
                <label key={branch.id} className="block text-sm">
                  <span className="mb-1 block font-medium text-stone-700">
                    {branch.name}
                    {branch.isDefault ? " (default)" : ""}
                  </span>
                  <input
                    className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                    value={branchNumbers[branch.id] ?? ""}
                    onChange={(e) =>
                      setBranchNumbers((prev) => ({
                        ...prev,
                        [branch.id]: e.target.value,
                      }))
                    }
                    placeholder="whatsapp:+14155238886"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-2 font-medium text-stone-900">Central brand number (optional)</h3>
            <p className="mb-3 text-sm text-stone-600">
              One shared number for the brand. Customers pick a branch before ordering.
            </p>
            <input
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
              value={centralNumber}
              onChange={(e) => setCentralNumber(e.target.value)}
              placeholder="whatsapp:+1..."
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            Save Twilio settings
          </button>
          {saved ? <p className="text-sm text-emerald-700">Saved.</p> : null}
          {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Readiness</h2>
        <ul className="space-y-2">
          {setup.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span>{item.done ? "✓" : "○"}</span>
              <span className={item.done ? "text-emerald-700" : "text-stone-700"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Webhook URLs</h2>
        <p className="mb-3 text-sm text-stone-600">
          Shared inbound webhook — routing uses the Twilio <strong>To</strong> number to find your
          branch or central line.
        </p>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-stone-700">Inbound (POST)</p>
            <button
              type="button"
              onClick={() => void copy(setup.webhooks.inbound)}
              className="mt-1 block w-full rounded-lg bg-stone-100 px-3 py-2 text-left font-mono text-xs"
            >
              {setup.webhooks.inbound}
            </button>
          </div>
          <div>
            <p className="font-medium text-stone-700">Status callback (optional)</p>
            <button
              type="button"
              onClick={() => void copy(setup.webhooks.status)}
              className="mt-1 block w-full rounded-lg bg-stone-100 px-3 py-2 text-left font-mono text-xs"
            >
              {setup.webhooks.status}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-amber-50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Sandbox join</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
          <li>
            From your phone, send <strong>{setup.sandbox.joinCommand}</strong> to{" "}
            <strong>{setup.sandbox.joinNumber}</strong>
          </li>
          <li>Set Twilio sandbox inbound webhook to the inbound URL above</li>
          <li>Message the sandbox number with <strong>menu</strong> and place a test order</li>
          <li>
            Approve payment on <Link href="/dashboard" className="underline">/dashboard</Link>
          </li>
        </ol>
      </section>
    </div>
  );
}

export default function TwilioAdminPage() {
  const { restaurant, branches, loading: tenantLoading } = useTenant();
  const [setup, setSetup] = useState<SetupResponse | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetch("/api/twilio/setup")
        .then((response) => response.json())
        .then((data: SetupResponse) => setSetup(data));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  if (tenantLoading) return <p className="p-8">Loading...</p>;
  if (!restaurant) return <p className="p-8">Tenant not found.</p>;

  const formKey = `${restaurant.id}:${branches.map((b) => `${b.id}:${b.twilioWhatsappFrom ?? ""}`).join(",")}:${restaurant.centralTwilioWhatsappFrom ?? ""}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/settings" className="text-amber-700 underline">
          Restaurant settings
        </Link>
        <Link href="/admin/branches" className="text-amber-700 underline">
          Branches
        </Link>
      </div>
      <h1 className="mb-2 text-3xl font-bold text-stone-900">Twilio WhatsApp Setup</h1>
      <p className="mb-2 text-stone-600">
        {restaurant.name} — per-branch numbers plus optional central line with branch picker.
      </p>

      {!setup ? (
        <p className="text-stone-500">Loading setup status...</p>
      ) : (
        <TwilioSettingsForm
          key={formKey}
          branches={branches}
          restaurant={restaurant}
          setup={setup}
        />
      )}
    </main>
  );
}
