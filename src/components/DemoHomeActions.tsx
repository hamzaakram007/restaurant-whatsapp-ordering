"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type DemoStatus = {
  demoMode: boolean;
  seedDemoData: boolean;
  twilioConfigured: boolean;
  orderCount: number;
  pendingPayments: number;
  activeOrders: number;
  completedToday: number;
};

export function DemoHomeActions() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [reseeding, setReseeding] = useState(false);

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/demo/status", { cache: "no-store" });
    if (response.ok) {
      setStatus((await response.json()) as DemoStatus);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function reseedDemo() {
    setReseeding(true);
    await fetch("/api/demo/seed", { method: "POST" });
    await loadStatus();
    setReseeding(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            status?.twilioConfigured
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {status?.twilioConfigured ? "Twilio ready" : "Simulate mode"}
        </span>
        {status?.seedDemoData ? (
          <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
            Demo data loaded
          </span>
        ) : null}
      </div>

      {status ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Orders" value={status.orderCount} />
          <StatCard label="Pending payments" value={status.pendingPayments} />
          <StatCard label="Active orders" value={status.activeOrders} />
          <StatCard label="Completed" value={status.completedToday} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/demo"
          className="rounded-2xl bg-[#075e54] px-6 py-3 text-sm font-semibold text-white"
        >
          Start WhatsApp Demo
        </Link>
        <button
          type="button"
          onClick={() => void reseedDemo()}
          disabled={reseeding}
          className="rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 disabled:opacity-50"
        >
          {reseeding ? "Reseeding..." : "Reseed demo data"}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}
