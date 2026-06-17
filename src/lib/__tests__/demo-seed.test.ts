import { describe, expect, it } from "vitest";
import { demoOrders } from "@/data/demo-seed";
import {
  getOrderById,
  resetDemoData,
  resetStoreForTests,
} from "@/lib/store";

describe("demo seed", () => {
  it("creates 5 orders in expected statuses", async () => {
    resetStoreForTests();
    const store = await resetDemoData();

    expect(store.orders).toBe(5);
    expect(store.customers).toBe(5);

    const statuses = demoOrders.map((order) => order.status);
    expect(statuses).toEqual([
      "payment_uploaded",
      "confirmed",
      "in_kitchen",
      "ready",
      "completed",
    ]);
  });

  it("gives order 1001 a payment screenshot", async () => {
    resetStoreForTests();
    await resetDemoData();

    const order = await getOrderById("demo-order-1001");
    expect(order?.orderNumber).toBe(1001);
    expect(order?.status).toBe("payment_uploaded");
    expect(order?.paymentScreenshotUrl).toContain("unsplash.com");
  });

  it("re-seeds cleanly after reset", async () => {
    resetStoreForTests();
    const first = await resetDemoData();
    const second = await resetDemoData();

    expect(first.orders).toBe(5);
    expect(second.orders).toBe(5);
    expect((await getOrderById("demo-order-1002"))?.status).toBe("confirmed");
  });
});
