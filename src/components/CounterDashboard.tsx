"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { DemoModeBanner, EmptyOrdersState } from "@/components/DemoModeBanner";
import { OrderEditButton } from "@/components/OrderEditModal";
import { OrderCard } from "@/components/OrderCard";
import { useTenant } from "@/components/TenantProvider";
import type { Order } from "@/lib/types";

function playBell() {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);
}

export function CounterDashboard() {
  const { config, branch } = useTenant();
  const currency = config?.currency ?? "PKR";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenPaymentOrders = useRef<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load orders");
      const data = (await response.json()) as { orders: Order[] };
      setOrders(data.orders);

      for (const order of data.orders) {
        if (
          order.status === "payment_uploaded" &&
          !seenPaymentOrders.current.has(order.id)
        ) {
          seenPaymentOrders.current.add(order.id);
          playBell();
        }
      }
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    const interval = window.setInterval(() => {
      void loadOrders();
    }, 4000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadOrders]);

  async function verifyPayment(orderId: string, action: "approve" | "reject") {
    const response = await fetch(`/api/orders/${orderId}/payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        verifiedBy: "counter",
        reason: action === "reject" ? "Screenshot unclear or amount mismatch" : undefined,
      }),
    });
    if (!response.ok) {
      alert("Payment action failed");
      return;
    }
    await loadOrders();
  }

  async function updateStatus(orderId: string, status: Order["status"]) {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      alert("Status update failed");
      return;
    }
    await loadOrders();
  }

  const pendingPayments = orders.filter((order) => order.status === "payment_uploaded");
  const activeOrders = orders.filter((order) =>
    ["confirmed", "in_kitchen", "ready", "out_for_delivery"].includes(order.status),
  );
  const hasNoOrders = !loading && orders.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Counter Dashboard</h1>
          <p className="text-stone-600">
            Payment verification and live order control
            {branch ? ` · ${branch.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BranchSwitcher />
          <Link
            href="/demo"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium"
          >
            WhatsApp demo
          </Link>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            Refresh
          </button>
        </div>
      </header>

      <DemoModeBanner />

      {loading ? <p>Loading orders...</p> : null}
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}

      {hasNoOrders ? <EmptyOrdersState context="counter" /> : null}

      {!hasNoOrders ? (
      <>
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-stone-900">
          Pending payment verification ({pendingPayments.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pendingPayments.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currency={currency}
              actions={
                <div className="flex flex-wrap gap-2">
                  <OrderEditButton order={order} onSaved={() => void loadOrders()} />
                  <button
                    type="button"
                    onClick={() => void verifyPayment(order.id, "approve")}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                  >
                    Approve payment
                  </button>
                  <button
                    type="button"
                    onClick={() => void verifyPayment(order.id, "reject")}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700"
                  >
                    Reject
                  </button>
                </div>
              }
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-900">
          Active orders ({activeOrders.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeOrders.length === 0 && !loading ? (
            <div className="md:col-span-2 xl:col-span-3">
              <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-sm text-stone-500">
                No active orders right now.
              </p>
            </div>
          ) : null}
          {activeOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currency={currency}
              actions={
                <div className="flex flex-wrap gap-2">
                  <OrderEditButton order={order} onSaved={() => void loadOrders()} />
                  {order.status === "confirmed" ? (
                    <button
                      type="button"
                      onClick={() => void updateStatus(order.id, "in_kitchen")}
                      className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white"
                    >
                      Send to kitchen
                    </button>
                  ) : null}
                  {order.status === "in_kitchen" ? (
                    <button
                      type="button"
                      onClick={() => void updateStatus(order.id, "ready")}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                    >
                      Mark ready
                    </button>
                  ) : null}
                  {order.status === "ready" && order.fulfillmentType === "delivery" ? (
                    <button
                      type="button"
                      onClick={() => void updateStatus(order.id, "out_for_delivery")}
                      className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white"
                    >
                      Out for delivery
                    </button>
                  ) : null}
                  {order.status === "ready" || order.status === "out_for_delivery" ? (
                    <button
                      type="button"
                      onClick={() => void updateStatus(order.id, "completed")}
                      className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white"
                    >
                      Complete
                    </button>
                  ) : null}
                </div>
              }
            />
          ))}
        </div>
      </section>
      </>
      ) : null}
    </div>
  );
}
