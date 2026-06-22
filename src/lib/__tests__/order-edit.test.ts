import { describe, expect, it } from "vitest";
import { restaurantConfig } from "@/data/restaurant-config";
import {
  EDITABLE_ORDER_STATUSES,
  isOrderEditable,
  recalculateOrderTotals,
  shouldResetPaymentAfterEdit,
} from "@/lib/order-edit";
import type { CartLine, Order } from "@/lib/types";

const sampleItems: CartLine[] = [
  {
    menuItemId: "latte",
    name: "Latte",
    quantity: 2,
    unitPriceCents: 45000,
    lineKey: "latte",
    selectedOptions: [],
  },
];

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    orderNumber: 1001,
    customerPhone: "whatsapp:+10000000000",
    status: "confirmed",
    paymentStatus: "paid",
    fulfillmentType: "delivery",
    items: sampleItems,
    subtotalCents: 90000,
    deliveryFeeCents: restaurantConfig.deliveryFeeCents,
    totalCents: 90000 + restaurantConfig.deliveryFeeCents,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("order-edit helpers", () => {
  it("marks only pre-kitchen statuses as editable", () => {
    expect(EDITABLE_ORDER_STATUSES).toEqual([
      "awaiting_payment",
      "payment_uploaded",
      "confirmed",
    ]);
    expect(isOrderEditable(baseOrder({ status: "confirmed" }))).toBe(true);
    expect(isOrderEditable(baseOrder({ status: "in_kitchen" }))).toBe(false);
    expect(isOrderEditable(baseOrder({ status: "cancelled" }))).toBe(false);
  });

  it("recalculates totals with delivery fee", () => {
    const delivery = recalculateOrderTotals(sampleItems, "delivery", restaurantConfig.deliveryFeeCents);
    expect(delivery.subtotalCents).toBe(90000);
    expect(delivery.deliveryFeeCents).toBe(restaurantConfig.deliveryFeeCents);
    expect(delivery.totalCents).toBe(90000 + restaurantConfig.deliveryFeeCents);

    const takeaway = recalculateOrderTotals(sampleItems, "takeaway", restaurantConfig.deliveryFeeCents);
    expect(takeaway.deliveryFeeCents).toBe(0);
    expect(takeaway.totalCents).toBe(90000);
  });

  it("requires payment reset when paid total changes", () => {
    const order = baseOrder({ paymentStatus: "paid", totalCents: 100000 });
    expect(shouldResetPaymentAfterEdit(order, 120000)).toBe(true);
    expect(shouldResetPaymentAfterEdit(order, 100000)).toBe(false);
    expect(
      shouldResetPaymentAfterEdit(
        baseOrder({ paymentStatus: "payment_requested" }),
        120000,
      ),
    ).toBe(false);
  });
});
