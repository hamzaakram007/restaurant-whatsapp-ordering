"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DemoModeBanner, EmptyOrdersState } from "@/components/DemoModeBanner";
import { formatOrderNumber, formatMoney } from "@/lib/format";
import type { Order } from "@/lib/types";

function playKitchenBell() {
  const context = new AudioContext();
  [660, 880, 990].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.1;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const start = context.currentTime + index * 0.18;
    oscillator.start(start);
    oscillator.stop(start + 0.25);
  });
}

export function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const seenOrders = useRef<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    const response = await fetch("/api/orders?status=confirmed,in_kitchen", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { orders: Order[] };
    setOrders(data.orders);

    for (const order of data.orders) {
      if (order.status === "confirmed" && !seenOrders.current.has(order.id)) {
        seenOrders.current.add(order.id);
        playKitchenBell();
      }
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const interval = setInterval(() => void loadOrders(), 3000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function acknowledge(orderId: string) {
    await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "in_kitchen", note: "Kitchen started prep" }),
    });
    await loadOrders();
  }

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8 text-stone-50">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Kitchen Display</h1>
        <p className="text-stone-400">New confirmed orders appear here with a bell alert</p>
      </header>

      <DemoModeBanner />

      {orders.length === 0 ? <EmptyOrdersState context="kitchen" /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => (
          <article
            key={order.id}
            className={`rounded-3xl border p-6 ${
              order.status === "confirmed"
                ? "border-amber-400 bg-amber-500/10"
                : "border-stone-700 bg-stone-900"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-3xl font-bold">{formatOrderNumber(order.orderNumber)}</h2>
              <span className="rounded-full bg-stone-800 px-3 py-1 text-sm uppercase tracking-wide">
                {order.fulfillmentType}
              </span>
            </div>

            <ul className="mb-4 space-y-2 text-lg">
              {order.items.map((item) => (
                <li key={`${order.id}-${item.menuItemId}`}>
                  <span className="font-semibold">{item.quantity}x</span> {item.name}
                </li>
              ))}
            </ul>

            <div className="mb-4 text-sm text-stone-300">
              {order.deliveryAddress ? <p>Deliver: {order.deliveryAddress}</p> : null}
              {order.pickupTime ? <p>Pickup: {order.pickupTime}</p> : null}
              <p>Total: {formatMoney(order.totalCents)}</p>
            </div>

            {order.status === "confirmed" ? (
              <button
                type="button"
                onClick={() => void acknowledge(order.id)}
                className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-lg font-semibold text-stone-950"
              >
                Acknowledge and start prep
              </button>
            ) : (
              <p className="text-emerald-300">Preparing in kitchen</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
