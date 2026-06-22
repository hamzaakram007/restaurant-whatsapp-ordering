"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { isOrderEditable } from "@/lib/order-edit";
import { useTenant } from "@/components/TenantProvider";
import type { CartLine, FulfillmentType, MenuItem, Order } from "@/lib/types";

type EditableLine = CartLine;

function cloneLines(items: CartLine[]): EditableLine[] {
  return items.map((item) => ({
    ...item,
    selectedOptions: item.selectedOptions.map((option) => ({ ...option })),
  }));
}

export function OrderEditModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { config } = useTenant();
  const currency = config?.currency ?? "PKR";
  const [lines, setLines] = useState<EditableLine[]>(() => cloneLines(order.items));
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    order.fulfillmentType,
  );
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress ?? "");
  const [pickupTime, setPickupTime] = useState(order.pickupTime ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [addItemId, setAddItemId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMenu() {
      const response = await fetch("/api/menu");
      if (!response.ok) return;
      const data = (await response.json()) as { items: MenuItem[] };
      setMenuItems(data.items.filter((item) => item.available));
    }
    void loadMenu();
  }, []);

  function updateQuantity(index: number, delta: number) {
    setLines((current) =>
      current
        .map((line, lineIndex) =>
          lineIndex === index
            ? { ...line, quantity: Math.max(1, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  function addMenuItem() {
    const item = menuItems.find((entry) => entry.id === addItemId);
    if (!item) return;

    const existingIndex = lines.findIndex((line) => line.lineKey === item.id);
    if (existingIndex >= 0) {
      updateQuantity(existingIndex, 1);
      return;
    }

    setLines((current) => [
      ...current,
      {
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        unitPriceCents: item.priceCents,
        lineKey: item.id,
        selectedOptions: [],
      },
    ]);
    setAddItemId("");
  }

  async function saveChanges() {
    if (lines.length === 0) {
      setError("Order must have at least one item.");
      return;
    }
    if (fulfillmentType === "delivery" && deliveryAddress.trim().length < 8) {
      setError("Please enter a complete delivery address.");
      return;
    }
    if (fulfillmentType === "takeaway" && pickupTime.trim().length < 3) {
      setError("Please enter a pickup time.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines,
          fulfillmentType,
          deliveryAddress:
            fulfillmentType === "delivery" ? deliveryAddress.trim() : undefined,
          pickupTime: fulfillmentType === "takeaway" ? pickupTime.trim() : undefined,
          notes: notes.trim() || undefined,
          updatedBy: "staff",
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save order");
      }
      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder() {
    if (!window.confirm(`Cancel order #${order.orderNumber}?`)) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cancel: true, updatedBy: "staff" }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to cancel order");
      }
      onSaved();
      onClose();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Cancel failed");
    } finally {
      setSaving(false);
    }
  }

  if (!isOrderEditable(order)) {
    return null;
  }

  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const deliveryFee =
    fulfillmentType === "delivery" ? (config?.deliveryFeeCents ?? 15000) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Edit order #{order.orderNumber}
            </h2>
            <p className="text-sm text-stone-500">{order.customerPhone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            Close
          </button>
        </div>

        <section className="mb-6 space-y-3">
          <h3 className="font-medium text-stone-900">Line items</h3>
          {lines.map((line, index) => (
            <div
              key={`${line.lineKey}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900">{line.name}</p>
                {line.selectedOptions.length > 0 ? (
                  <p className="text-xs text-stone-500">
                    {line.selectedOptions.map((option) => option.label).join(" · ")}
                  </p>
                ) : null}
                <p className="text-sm text-stone-600">
                  {formatMoney(line.unitPriceCents, currency)} each
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(index, -1)}
                  className="rounded-lg border px-2 py-1 text-sm"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(index, 1)}
                  className="rounded-lg border px-2 py-1 text-sm"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-sm text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <select
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
              value={addItemId}
              onChange={(event) => setAddItemId(event.target.value)}
            >
              <option value="">Add item from menu…</option>
              {menuItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatMoney(item.priceCents, currency)})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addMenuItem}
              disabled={!addItemId}
              className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </section>

        <section className="mb-6 space-y-3">
          <h3 className="font-medium text-stone-900">Fulfillment</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFulfillmentType("delivery")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                fulfillmentType === "delivery"
                  ? "bg-amber-600 text-white"
                  : "border border-stone-300"
              }`}
            >
              Delivery
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentType("takeaway")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                fulfillmentType === "takeaway"
                  ? "bg-amber-600 text-white"
                  : "border border-stone-300"
              }`}
            >
              Takeaway
            </button>
          </div>
          {fulfillmentType === "delivery" ? (
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={2}
              placeholder="Delivery address"
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
            />
          ) : (
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Pickup time"
              value={pickupTime}
              onChange={(event) => setPickupTime(event.target.value)}
            />
          )}
        </section>

        <section className="mb-6">
          <h3 className="mb-2 font-medium text-stone-900">Notes</h3>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={2}
            placeholder="Special instructions"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </section>

        <p className="mb-4 text-sm text-stone-600">
          Estimated total: {formatMoney(subtotal + deliveryFee, currency)}
        </p>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveChanges()}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={() => void cancelOrder()}
            disabled={saving}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
          >
            Cancel order
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderEditButton({
  order,
  onSaved,
}: {
  order: Order;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!isOrderEditable(order)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
      >
        Edit order
      </button>
      {open ? (
        <OrderEditModal
          order={order}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      ) : null}
    </>
  );
}
