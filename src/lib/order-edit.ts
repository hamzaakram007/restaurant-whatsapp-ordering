import type { CartLine, FulfillmentType, Order, OrderStatus } from "@/lib/types";

export const EDITABLE_ORDER_STATUSES: OrderStatus[] = [
  "awaiting_payment",
  "payment_uploaded",
  "confirmed",
];

export function isOrderEditable(order: Pick<Order, "status">) {
  return EDITABLE_ORDER_STATUSES.includes(order.status);
}

export function recalculateOrderTotals(
  items: CartLine[],
  fulfillmentType: FulfillmentType,
  deliveryFeeCents: number,
) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const fee = fulfillmentType === "delivery" ? deliveryFeeCents : 0;
  const totalCents = subtotalCents + fee;
  return { subtotalCents, deliveryFeeCents: fee, totalCents };
}

export function shouldResetPaymentAfterEdit(order: Order, newTotalCents: number) {
  return order.paymentStatus === "paid" && newTotalCents !== order.totalCents;
}
