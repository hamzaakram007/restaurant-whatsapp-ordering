import { describe, expect, it } from "vitest";
import { DEFAULT_BRANCH_ID } from "@/lib/branch-constants";
import { demoOrders } from "@/data/demo-seed";
import {
  getOrderById,
  resetDemoData,
  resetStoreForTests,
} from "@/lib/store";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant-constants";

const restaurantId = DEFAULT_RESTAURANT_ID;
const branchId = DEFAULT_BRANCH_ID;

describe("demo seed", () => {
  it("creates 5 orders in expected statuses", async () => {
    resetStoreForTests();
    const store = await resetDemoData(restaurantId, branchId);

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
    await resetDemoData(restaurantId, branchId);

    const order = await getOrderById(restaurantId, branchId, "demo-order-1001");
    expect(order?.orderNumber).toBe(1001);
    expect(order?.status).toBe("payment_uploaded");
    expect(order?.paymentScreenshotUrl).toContain("unsplash.com");
  });

  it("re-seeds cleanly after reset", async () => {
    resetStoreForTests();
    const first = await resetDemoData(restaurantId, branchId);
    const second = await resetDemoData(restaurantId, branchId);

    expect(first.orders).toBe(5);
    expect(second.orders).toBe(5);
    expect((await getOrderById(restaurantId, branchId, "demo-order-1002"))?.status).toBe(
      "confirmed",
    );
  });
});
