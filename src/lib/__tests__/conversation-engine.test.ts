import { describe, expect, it } from "vitest";
import { DEFAULT_BRANCH_ID } from "@/lib/branch-constants";
import { handleCustomerMessage } from "@/lib/conversation-engine";
import {
  findActiveOrderByPhone,
  findLatestOrderByPhone,
  getCart,
  resetStoreForTests,
  updateOrder,
} from "@/lib/store";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant-constants";

const phone = "whatsapp:+15550009999";
const restaurantId = DEFAULT_RESTAURANT_ID;
const branchId = DEFAULT_BRANCH_ID;

function msg(body: string, extra: Partial<Parameters<typeof handleCustomerMessage>[0]> = {}) {
  return handleCustomerMessage({
    restaurantId,
    branchId,
    customerPhone: phone,
    body,
    ...extra,
  });
}

function lastMessage(result: Awaited<ReturnType<typeof handleCustomerMessage>>) {
  return result.messages.at(-1)?.body ?? "";
}

describe("conversation engine", () => {
  it("shows menu categories on greeting", async () => {
    resetStoreForTests();
    const result = await msg("hi");
    expect(lastMessage(result)).toContain("Coffee");
    expect(lastMessage(result)).toContain("Tea");
  });

  it("prompts for size and prices medium latte correctly", async () => {
    resetStoreForTests();

    await msg("menu");
    await msg("1");
    const optionPrompt = await msg("1");
    expect(lastMessage(optionPrompt).toLowerCase()).toContain("size");
    await msg("2");
    await msg("skip");
    const added = await msg("skip");

    expect(lastMessage(added)).toContain("Medium");
    const cart = await getCart(restaurantId, branchId, phone);
    expect(cart[0]?.unitPriceCents).toBe(48000);
  });

  it("completes delivery order flow through payment screenshot", async () => {
    resetStoreForTests();

    await msg("menu");
    await msg("1");
    await msg("1x2");
    await msg("2");
    await msg("skip");
    await msg("skip");
    await msg("checkout");
    await msg("1");
    await msg("House 12, Main Street, Gulberg");
    await msg("yes");

    const awaitingPayment = await findActiveOrderByPhone(restaurantId, branchId, phone);
    expect(awaitingPayment?.status).toBe("awaiting_payment");
    expect(awaitingPayment?.fulfillmentType).toBe("delivery");

    const screenshotResult = await msg("", { mediaUrl: "https://example.com/payment.jpg" });

    expect(lastMessage(screenshotResult)).toContain("Payment screenshot received");
    expect((await findLatestOrderByPhone(restaurantId, branchId, phone))?.status).toBe(
      "payment_uploaded",
    );
  });

  it("supports takeaway pickup flow", async () => {
    resetStoreForTests();

    await msg("menu");
    await msg("2");
    await msg("1");
    await msg("1");
    await msg("skip");
    await msg("checkout");
    await msg("2");
    await msg("6:30 PM");
    await msg("yes");

    const order = await findLatestOrderByPhone(restaurantId, branchId, phone);
    expect(order?.fulfillmentType).toBe("takeaway");
    expect(order?.pickupTime).toBe("6:30 PM");
    expect(order?.deliveryFeeCents).toBe(0);
  });

  it("lets customers edit delivery address on an editable order", async () => {
    resetStoreForTests();

    await msg("menu");
    await msg("1");
    await msg("1");
    await msg("2");
    await msg("skip");
    await msg("skip");
    await msg("checkout");
    await msg("1");
    await msg("House 12, Main Street, Gulberg");
    await msg("yes");

    const editMenu = await msg("edit order");
    expect(lastMessage(editMenu)).toContain("What would you like to change");

    await msg("2");
    const updated = await msg("House 99, New Block, Gulberg");

    expect(lastMessage(updated)).toContain("Address updated");
    const order = await findLatestOrderByPhone(restaurantId, branchId, phone);
    expect(order?.deliveryAddress).toBe("House 99, New Block, Gulberg");
  });

  it("blocks edit when order is already in the kitchen", async () => {
    resetStoreForTests();

    await msg("menu");
    await msg("2");
    await msg("1");
    await msg("1");
    await msg("skip");
    await msg("checkout");
    await msg("2");
    await msg("6:30 PM");
    await msg("yes");

    const order = await findLatestOrderByPhone(restaurantId, branchId, phone);
    expect(order).toBeTruthy();
    await updateOrder(restaurantId, branchId, order!.id, { status: "in_kitchen" });

    const blocked = await msg("edit order");
    expect(lastMessage(blocked)).toContain("cannot be changed");
  });
});
