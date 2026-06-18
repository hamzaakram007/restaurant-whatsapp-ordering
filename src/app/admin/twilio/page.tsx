"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SetupResponse = {
  ready: boolean;
  twilioConfigured: boolean;
  database: boolean;
  publicAppUrl: string | null;
  publicAppUrlMatchesRequest: boolean;
  webhooks: { inbound: string; status: string };
  sandbox: { joinNumber: string; joinCommand: string; senderExample: string };
  checklist: { id: string; label: string; done: boolean }[];
};

export default function TwilioAdminPage() {
  const [setup, setSetup] = useState<SetupResponse | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetch("/api/twilio/setup")
        .then((response) => response.json())
        .then((data: SetupResponse) => setSetup(data));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-amber-700 underline">
        Back to home
      </Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold text-stone-900">Twilio WhatsApp Setup</h1>
      <p className="mb-8 text-stone-600">
        Use this checklist before a live client demo on real WhatsApp.
      </p>

      {!setup ? (
        <p className="text-stone-500">Loading setup status...</p>
      ) : (
        <div className="space-y-6">
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
            <p className="mt-4 text-sm font-medium text-stone-800">
              {setup.ready
                ? "Core configuration looks good. Connect the sandbox webhook and test from your phone."
                : "Set missing Vercel env vars, then connect the sandbox webhook."}
            </p>
          </section>

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Webhook URLs</h2>
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
              <li>
                Set Vercel env: <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>,{" "}
                <code>TWILIO_WHATSAPP_FROM</code>, <code>PUBLIC_APP_URL</code>,{" "}
                <code>DATABASE_URL</code>
              </li>
              <li>Message the sandbox number with <strong>menu</strong> and place a test order</li>
              <li>Approve payment on <Link href="/dashboard" className="underline">/dashboard</Link></li>
            </ol>
          </section>
        </div>
      )}
    </main>
  );
}
