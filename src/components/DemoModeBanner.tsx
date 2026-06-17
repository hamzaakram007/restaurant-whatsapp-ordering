"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function DemoModeBanner() {
  const [twilioConfigured, setTwilioConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/demo/status")
      .then((response) => response.json())
      .then((data: { twilioConfigured: boolean }) => {
        setTwilioConfigured(data.twilioConfigured);
      })
      .catch(() => setTwilioConfigured(false));
  }, []);

  if (twilioConfigured === null || twilioConfigured) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      Showing sample orders in demo mode. Connect Twilio for live WhatsApp, or use{" "}
      <Link href="/demo" className="font-semibold underline">
        /demo
      </Link>{" "}
      to simulate customer chat.
    </div>
  );
}

export function EmptyOrdersState({ context }: { context: "counter" | "kitchen" }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center">
      <p className="text-lg font-medium text-stone-800">No orders to show yet</p>
      <p className="mt-2 text-sm text-stone-600">
        {context === "counter"
          ? "Reseed demo data from the home page or place an order in the WhatsApp demo."
          : "Confirmed orders will appear here after payment is approved on the counter."}
      </p>
      <Link
        href="/demo"
        className="mt-4 inline-block rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white"
      >
        Open WhatsApp demo
      </Link>
    </div>
  );
}
