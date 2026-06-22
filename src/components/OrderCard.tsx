import type { ReactNode } from "react";
import type { Order } from "@/lib/types";
import { formatMoney, formatOrderNumber } from "@/lib/format";

export function OrderStatusBadge({ status }: { status: Order["status"] }) {
  const colors: Record<string, string> = {
    payment_uploaded: "bg-amber-100 text-amber-900",
    awaiting_payment: "bg-orange-100 text-orange-900",
    confirmed: "bg-blue-100 text-blue-900",
    in_kitchen: "bg-purple-100 text-purple-900",
    ready: "bg-emerald-100 text-emerald-900",
    out_for_delivery: "bg-cyan-100 text-cyan-900",
    completed: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-900",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function OrderCard({
  order,
  actions,
  currency = "PKR",
}: {
  order: Order;
  actions?: ReactNode;
  currency?: string;
}) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">
            {formatOrderNumber(order.orderNumber)}
          </h3>
          <p className="text-sm text-stone-500">{order.customerPhone}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <ul className="mb-4 space-y-2 text-sm text-stone-700">
        {order.items.map((item) => (
          <li key={`${order.id}-${item.lineKey ?? item.menuItemId}`}>
            <div>
              {item.name} x{item.quantity}
            </div>
            {item.selectedOptions?.length ? (
              <p className="text-xs text-stone-500">
                {item.selectedOptions.map((option) => option.label).join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mb-4 grid gap-1 text-sm text-stone-600">
        <p>
          <span className="font-medium">Type:</span>{" "}
          {order.fulfillmentType === "delivery" ? "Delivery" : "Takeaway"}
        </p>
        {order.deliveryAddress ? <p>Address: {order.deliveryAddress}</p> : null}
        {order.pickupTime ? <p>Pickup: {order.pickupTime}</p> : null}
        {order.notes ? <p>Notes: {order.notes}</p> : null}
        <p>
          <span className="font-medium">Total:</span> {formatMoney(order.totalCents, currency)}
        </p>
        <p>
          <span className="font-medium">Payment:</span> {order.paymentStatus}
        </p>
      </div>

      {order.paymentScreenshotUrl ? (
        <a
          href={`/api/orders/${order.id}/payment-screenshot`}
          target="_blank"
          rel="noreferrer"
          className="mb-4 inline-block text-sm font-medium text-amber-700 underline"
        >
          View payment screenshot
        </a>
      ) : null}

      {actions}
    </article>
  );
}
