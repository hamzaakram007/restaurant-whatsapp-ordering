import Link from "next/link";
import { DemoHomeActions } from "@/components/DemoHomeActions";
import { restaurantConfig } from "@/data/restaurant-config";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16">
        <section>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Client demo ready
          </p>
          <h1 className="mb-4 text-5xl font-bold text-stone-900">{restaurantConfig.name}</h1>
          <p className="max-w-2xl text-lg text-stone-600">
            Customers order on WhatsApp, confirm delivery or takeaway, pay by bank transfer,
            upload a screenshot, and receive live tracking updates. Staff use the counter and
            kitchen dashboards with bell alerts.
          </p>
        </section>

        <DemoHomeActions />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/demo"
            className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6 shadow-sm transition hover:border-emerald-400"
          >
            <h2 className="text-xl font-semibold text-emerald-900">WhatsApp Demo</h2>
            <p className="mt-2 text-sm text-emerald-800">
              Interactive chat simulator for client presentations without Twilio.
            </p>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300"
          >
            <h2 className="text-xl font-semibold">Counter Dashboard</h2>
            <p className="mt-2 text-sm text-stone-600">
              Verify payment screenshots, move orders through statuses, and manage live orders.
            </p>
          </Link>
          <Link
            href="/kitchen"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300"
          >
            <h2 className="text-xl font-semibold">Kitchen Display</h2>
            <p className="mt-2 text-sm text-stone-600">
              Large-screen receipt view with bell alerts for new confirmed orders.
            </p>
          </Link>
          <Link
            href="/admin/menu"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300"
          >
            <h2 className="text-xl font-semibold">Menu Admin</h2>
            <p className="mt-2 text-sm text-stone-600">
              Manage items, sizes, add-ons, and availability for the WhatsApp menu bot.
            </p>
          </Link>
          <Link
            href="/admin/twilio"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300"
          >
            <h2 className="text-xl font-semibold">Twilio Setup</h2>
            <p className="mt-2 text-sm text-stone-600">
              Webhook URLs and checklist for connecting real WhatsApp before the client demo.
            </p>
          </Link>
        </section>

        <section className="rounded-3xl border border-dashed border-amber-300 bg-amber-50/70 p-6">
          <h2 className="text-lg font-semibold text-stone-900">After the demo: connect Twilio</h2>
          <p className="mt-2 text-sm text-stone-600">
            Configure Twilio inbound webhook to <code>/api/twilio/whatsapp</code>. See{" "}
            <code>docs/TWILIO_SETUP.md</code> for the full checklist.
          </p>
        </section>
      </div>
    </main>
  );
}
