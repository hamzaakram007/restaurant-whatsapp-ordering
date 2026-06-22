import Link from "next/link";
import { DemoHomeActions } from "@/components/DemoHomeActions";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16">
        <section>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Multi-tenant SaaS
          </p>
          <h1 className="mb-4 text-5xl font-bold text-stone-900">
            WhatsApp ordering for every cafe
          </h1>
          <p className="max-w-2xl text-lg text-stone-600">
            Each restaurant gets its own subdomain, menu, WhatsApp number, counter dashboard,
            and kitchen display. Start a free trial or open the default demo tenant.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white"
          >
            Start free trial
          </Link>
          <Link
            href="/dashboard?tenant=brew-bite"
            className="rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800"
          >
            Open brew-bite demo
          </Link>
          <Link
            href="/super-admin"
            className="rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800"
          >
            Platform admin
          </Link>
        </div>

        <DemoHomeActions />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/demo?tenant=brew-bite"
            className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6 shadow-sm transition hover:border-emerald-400"
          >
            <h2 className="text-xl font-semibold text-emerald-900">WhatsApp Demo</h2>
            <p className="mt-2 text-sm text-emerald-800">
              Interactive chat simulator per restaurant tenant.
            </p>
          </Link>
          <Link
            href="/dashboard?tenant=brew-bite"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300"
          >
            <h2 className="text-xl font-semibold">Counter Dashboard</h2>
            <p className="mt-2 text-sm text-stone-600">
              Payment verification and order edits, scoped per tenant.
            </p>
          </Link>
          <Link
            href="/kitchen?tenant=brew-bite"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300"
          >
            <h2 className="text-xl font-semibold">Kitchen Display</h2>
            <p className="mt-2 text-sm text-stone-600">
              Prep queue with bell alerts for each restaurant.
            </p>
          </Link>
          <Link
            href="/admin/settings?tenant=brew-bite"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300"
          >
            <h2 className="text-xl font-semibold">Restaurant Settings</h2>
            <p className="mt-2 text-sm text-stone-600">
              Branding, payment details, and delivery fee per tenant.
            </p>
          </Link>
        </section>

        <section className="rounded-3xl border border-dashed border-amber-300 bg-amber-50/70 p-6">
          <h2 className="text-lg font-semibold text-stone-900">Local dev tip</h2>
          <p className="mt-2 text-sm text-stone-600">
            Use <code>?tenant=brew-bite</code> on localhost, or configure{" "}
            <code>DEFAULT_TENANT_SLUG=brew-bite</code>. Demo login:{" "}
            <code>owner@brew-bite.test</code> / <code>password123</code> (when{" "}
            <code>DEMO_MODE</code> is not blocking auth).
          </p>
        </section>
      </div>
    </main>
  );
}
