import { describe, expect, it } from "vitest";
import { handleCustomerMessage } from "@/lib/conversation-engine";
import {
  findActiveOrderByPhone,
  findLatestOrderByPhone,
  getCart,
  resetStoreForTests,
} from "@/lib/store";

const phone = "whatsapp:+15550009999";

function lastMessage(result: Awaited<ReturnType<typeof handleCustomerMessage>>) {
  return result.messages.at(-1)?.body ?? "";
}

describe("conversation engine", () => {
  it("shows menu categories on greeting", async () => {
    resetStoreForTests();
    const result = await handleCustomerMessage({ customerPhone: phone, body: "hi" });
    expect(lastMessage(result)).toContain("Coffee");
    expect(lastMessage(result)).toContain("Tea");
  });

  it("prompts for size and prices medium latte correctly", async () => {
    resetStoreForTests();

    await handleCustomerMessage({ customerPhone: phone, body: "menu" });
    await handleCustomerMessage({ customerPhone: phone, body: "1" });
    const optionPrompt = await handleCustomerMessage({ customerPhone: phone, body: "1" });
    expect(lastMessage(optionPrompt).toLowerCase()).toContain("size");
    await handleCustomerMessage({ customerPhone: phone, body: "2" });
    await handleCustomerMessage({ customerPhone: phone, body: "skip" });
    const added = await handleCustomerMessage({ customerPhone: phone, body: "skip" });

    expect(lastMessage(added)).toContain("Medium");
    const cart = await getCart(phone);
    expect(cart[0]?.unitPriceCents).toBe(48000);
  });

  it("completes delivery order flow through payment screenshot", async () => {
    resetStoreForTests();

    await handleCustomerMessage({ customerPhone: phone, body: "menu" });
    await handleCustomerMessage({ customerPhone: phone, body: "1" });
    await handleCustomerMessage({ customerPhone: phone, body: "1x2" });
    await handleCustomerMessage({ customerPhone: phone, body: "2" });
    await handleCustomerMessage({ customerPhone: phone, body: "skip" });
    await handleCustomerMessage({ customerPhone: phone, body: "skip" });
    await handleCustomerMessage({ customerPhone: phone, body: "checkout" });
    await handleCustomerMessage({ customerPhone: phone, body: "1" });
    await handleCustomerMessage({
      customerPhone: phone,
      body: "House 12, Main Street, Gulberg",
    });
    await handleCustomerMessage({ customerPhone: phone, body: "yes" });

    const awaitingPayment = await findActiveOrderByPhone(phone);
    expect(awaitingPayment?.status).toBe("awaiting_payment");
    expect(awaitingPayment?.fulfillmentType).toBe("delivery");

    const screenshotResult = await handleCustomerMessage({
      customerPhone: phone,
      body: "",
      mediaUrl: "https://example.com/payment.jpg",
    });

    expect(lastMessage(screenshotResult)).toContain("Payment screenshot received");
    expect((await findLatestOrderByPhone(phone))?.status).toBe("payment_uploaded");
  });

  it("supports takeaway pickup flow", async () => {
    resetStoreForTests();

    await handleCustomerMessage({ customerPhone: phone, body: "menu" });
    await handleCustomerMessage({ customerPhone: phone, body: "2" });
    await handleCustomerMessage({ customerPhone: phone, body: "1" });
    await handleCustomerMessage({ customerPhone: phone, body: "1" });
    await handleCustomerMessage({ customerPhone: phone, body: "skip" });
    await handleCustomerMessage({ customerPhone: phone, body: "checkout" });
    await handleCustomerMessage({ customerPhone: phone, body: "2" });
    await handleCustomerMessage({ customerPhone: phone, body: "6:30 PM" });
    await handleCustomerMessage({ customerPhone: phone, body: "yes" });

    const order = await findLatestOrderByPhone(phone);
    expect(order?.fulfillmentType).toBe("takeaway");
    expect(order?.pickupTime).toBe("6:30 PM");
    expect(order?.deliveryFeeCents).toBe(0);
  });
});
