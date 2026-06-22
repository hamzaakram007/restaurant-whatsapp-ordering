import { describe, expect, it } from "vitest";
import { DEFAULT_BRANCH_ID } from "@/lib/branch-constants";
import {
  createBranch,
  ensureDefaultBranch,
  getDefaultBranch,
  upsertBranchOverride,
} from "@/lib/branch-store";
import { getEffectiveMenuItems } from "@/lib/branch-menu";
import { handleCustomerMessage } from "@/lib/conversation-engine";
import {
  findLatestOrderByPhone,
  getMenuItems,
  resetStoreForTests,
} from "@/lib/store";
import { initMemoryStoresForTests } from "@/lib/restaurant-store";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant-constants";

const phone = "whatsapp:+15550009999";

describe("branch isolation", () => {
  it("keeps orders and effective menus separate per branch", async () => {
    resetStoreForTests();
    initMemoryStoresForTests();
    await ensureDefaultBranch(DEFAULT_RESTAURANT_ID);

    const lahore = await createBranch({
      restaurantId: DEFAULT_RESTAURANT_ID,
      slug: "lahore",
      name: "Lahore DHA",
      city: "Lahore",
    });

    await upsertBranchOverride({
      branchId: lahore.id,
      menuItemId: "latte",
      priceCents: 99999,
      available: true,
    });

    const mainMenu = await getMenuItems(DEFAULT_RESTAURANT_ID, DEFAULT_BRANCH_ID);
    const lahoreMenu = await getMenuItems(DEFAULT_RESTAURANT_ID, lahore.id);
    const lahoreLatte = lahoreMenu.find((i) => i.id === "latte");
    const mainLatte = mainMenu.find((i) => i.id === "latte");

    expect(lahoreLatte?.priceCents).toBe(99999);
    expect(mainLatte?.priceCents).not.toBe(99999);

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
      body: "6:30 PM",
    });
    await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerPhone: phone,
      body: "yes",
    });

    const orderMain = await findLatestOrderByPhone(
      DEFAULT_RESTAURANT_ID,
      DEFAULT_BRANCH_ID,
      phone,
    );
    const orderLahore = await findLatestOrderByPhone(
      DEFAULT_RESTAURANT_ID,
      lahore.id,
      phone,
    );

    expect(orderMain).toBeTruthy();
    expect(orderLahore).toBeUndefined();
  });

  it("routes central line through branch picker", async () => {
    resetStoreForTests();
    initMemoryStoresForTests();
    await ensureDefaultBranch(DEFAULT_RESTAURANT_ID);

    await createBranch({
      restaurantId: DEFAULT_RESTAURANT_ID,
      slug: "karachi",
      name: "Karachi Clifton",
      city: "Karachi",
    });

    const branches = await import("@/lib/branch-store").then((m) =>
      m.listBranches(DEFAULT_RESTAURANT_ID),
    );
    expect(branches.length).toBeGreaterThanOrEqual(2);

    const pick = await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      isCentralLine: true,
      customerPhone: "whatsapp:+15550007777",
      body: "menu",
    });

    expect(pick.messages[0]?.body).toMatch(/branch|location|Reply/i);

    const result = await handleCustomerMessage({
      restaurantId: DEFAULT_RESTAURANT_ID,
      isCentralLine: true,
      customerPhone: "whatsapp:+15550007777",
      body: "1",
    });

    expect(result.messages.some((m) => m.body.toLowerCase().includes("welcome"))).toBe(
      true,
    );
  });
});

describe("effective menu merge", () => {
  it("applies branch overrides on master items", async () => {
    resetStoreForTests();
    initMemoryStoresForTests();
    const branch = await getDefaultBranch(DEFAULT_RESTAURANT_ID);
    expect(branch).toBeTruthy();

    await upsertBranchOverride({
      branchId: branch!.id,
      menuItemId: "americano",
      available: false,
    });

    const items = await getEffectiveMenuItems(DEFAULT_RESTAURANT_ID, branch!.id);
    expect(items.find((i) => i.id === "americano")).toBeUndefined();
  });
});
