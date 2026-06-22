import { describe, expect, it } from "vitest";
import { DEFAULT_BRANCH_ID } from "@/lib/branch-constants";
import { getDefaultBranch } from "@/lib/branch-store";
import { handleCustomerMessage } from "@/lib/conversation-engine";
import { createRestaurant, initMemoryStoresForTests } from "@/lib/restaurant-store";
import {
  findLatestOrderByPhone,
  getMenuItems,
  resetStoreForTests,
} from "@/lib/store";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant-constants";

const phone = "whatsapp:+15550008888";

describe("tenant isolation", () => {
  it("keeps orders and menus separate per restaurant", async () => {
    resetStoreForTests();
    initMemoryStoresForTests();

    const tenantB = await createRestaurant({
      slug: "second-cafe",
      name: "Second Cafe",
    });
    const branchB = await getDefaultBranch(tenantB.id);
    expect(branchB).toBeTruthy();

    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "menu",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "2",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "1",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "1",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "skip",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "checkout",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "2",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "6:00 PM",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "yes",
    });

    const orderA = await findLatestOrderByPhone(DEFAULT_RESTAURANT_ID, DEFAULT_BRANCH_ID, phone);
    const orderB = await findLatestOrderByPhone(tenantB.id, branchB!.id, phone);

    expect(orderA).toBeTruthy();
    expect(orderB).toBeUndefined();

    const menuA = await getMenuItems(DEFAULT_RESTAURANT_ID, DEFAULT_BRANCH_ID);
    const menuB = await getMenuItems(tenantB.id, branchB!.id);
    expect(menuA.length).toBeGreaterThan(0);
    expect(menuB.length).toBe(0);
  });
});
