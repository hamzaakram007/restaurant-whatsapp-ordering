import { restaurantConfig } from "@/data/restaurant-config";
import { formatMoney, formatOrderNumber } from "@/lib/format";
import {
  addToCart,
  createOrderFromCart,
  ensureStoreReady,
  findActiveOrderByPhone,
  findLatestOrderByPhone,
  getCart,
  getCategories,
  getMenuItemById,
  getMenuItems,
  getOrCreateConversation,
  getOrCreateCustomer,
  setConversationStep,
  updateConversation,
  updateOrder,
} from "@/lib/store";
import type { BotResult, FulfillmentType } from "@/lib/types";

type InboundInput = {
  customerPhone: string;
  body: string;
  mediaUrl?: string;
  mediaContentType?: string;
};

function reply(messages: string | string[]): BotResult {
  const list = Array.isArray(messages) ? messages : [messages];
  return { messages: list.map((body) => ({ body })) };
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function isGreeting(text: string) {
  return /^(hi|hello|hey|menu|start|order|salam|assalam)/i.test(text);
}

function isYes(text: string) {
  return /^(yes|y|confirm|ok|okay|done|proceed)/i.test(text);
}

function isNo(text: string) {
  return /^(no|n|cancel|stop|back)/i.test(text);
}

async function formatMenuCategories() {
  const categories = await getCategories();
  const lines = categories.map(
    (category, index) => `${index + 1}. ${category.name}`,
  );
  return [
    `Welcome to ${restaurantConfig.name}!`,
    restaurantConfig.tagline,
    "",
    "Reply with a category number to browse:",
    ...lines,
    "",
    "Commands: cart | checkout | track | help",
  ].join("\n");
}

async function formatCategoryItems(categoryId: string) {
  const items = await getMenuItems(categoryId);
  if (items.length === 0) {
    return "No items are available in this category right now.";
  }

  const lines = items.map(
    (item, index) =>
      `${index + 1}. ${item.name} - ${formatMoney(item.priceCents)}\n   ${item.description}`,
  );

  return [
    "Add items by replying with: <number> or <number>x<qty>",
    "Example: 1x2 adds two of item 1",
    "",
    ...lines,
    "",
    "Reply menu to go back | cart to view cart | checkout when ready",
  ].join("\n");
}

async function formatCartSummary(phone: string) {
  const cart = await getCart(phone);
  if (cart.length === 0) {
    return "Your cart is empty. Reply menu to browse categories.";
  }

  const lines = cart.map(
    (item) =>
      `- ${item.name} x${item.quantity} = ${formatMoney(item.unitPriceCents * item.quantity)}`,
  );
  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  return [
    "Your cart:",
    ...lines,
    "",
    `Subtotal: ${formatMoney(subtotal)}`,
    "",
    "Reply checkout to continue or menu to add more items.",
  ].join("\n");
}

function formatPaymentInstructions(orderTotalCents: number) {
  const { payment } = restaurantConfig;
  return [
    `Total due: ${formatMoney(orderTotalCents)}`,
    "",
    "Please transfer to:",
    `Account title: ${payment.accountTitle}`,
    `Bank: ${payment.bankName}`,
    `Account #: ${payment.accountNumber}`,
    `IBAN: ${payment.iban}`,
    "",
    payment.instructions,
  ].join("\n");
}

async function formatOrderSummary(input: {
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  pickupTime?: string;
  phone: string;
}) {
  const cart = await getCart(input.phone);
  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const deliveryFeeCents =
    input.fulfillmentType === "delivery" ? restaurantConfig.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  const lines = cart.map(
    (item) => `- ${item.name} x${item.quantity} (${formatMoney(item.unitPriceCents)})`,
  );

  return [
    "Order summary:",
    ...lines,
    "",
    `Subtotal: ${formatMoney(subtotalCents)}`,
    input.fulfillmentType === "delivery"
      ? `Delivery fee: ${formatMoney(deliveryFeeCents)}`
      : "Pickup: no delivery fee",
    `Total: ${formatMoney(totalCents)}`,
    `Type: ${input.fulfillmentType === "delivery" ? "Delivery" : "Takeaway"}`,
    input.deliveryAddress ? `Address: ${input.deliveryAddress}` : null,
    input.pickupTime ? `Pickup time: ${input.pickupTime}` : null,
    "",
    "Reply YES to confirm or NO to cancel.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function parseItemSelection(text: string, shownItemIds: string[]) {
  const match = text.match(/^(\d+)\s*(?:x\s*(\d+))?$/i);
  if (!match) return null;

  const index = Number(match[1]) - 1;
  const quantity = match[2] ? Number(match[2]) : 1;
  if (index < 0 || index >= shownItemIds.length || quantity < 1) return null;

  const menuItem = await getMenuItemById(shownItemIds[index]);
  if (!menuItem || !menuItem.available) return null;

  return { menuItem, quantity };
}

async function handlePaymentScreenshot(input: InboundInput): Promise<BotResult> {
  const order = await findActiveOrderByPhone(input.customerPhone);
  if (!order || order.status !== "awaiting_payment") {
    return reply(
      "I do not have a pending payment for you. Reply menu to start a new order.",
    );
  }

  if (!input.mediaUrl) {
    return reply(
      "Please send a screenshot image of your payment transfer so we can verify it.",
    );
  }

  await updateOrder(order.id, {
    status: "payment_uploaded",
    paymentScreenshotUrl: input.mediaUrl,
  });
  await setConversationStep(input.customerPhone, "idle");

  return reply(
    `Payment screenshot received for order ${formatOrderNumber(order.orderNumber)}. Our team will verify it shortly. You will get a WhatsApp update once confirmed.`,
  );
}

async function handleTrackOrder(phone: string): Promise<BotResult> {
  const order = await findLatestOrderByPhone(phone);
  if (!order) {
    return reply("No orders found yet. Reply menu to place your first order.");
  }

  const statusLabels: Record<string, string> = {
    awaiting_payment: "Waiting for payment",
    payment_uploaded: "Payment screenshot received, pending verification",
    confirmed: "Confirmed",
    in_kitchen: "Preparing in kitchen",
    ready: "Ready",
    out_for_delivery: "Out for delivery",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return reply(
    [
      `Order ${formatOrderNumber(order.orderNumber)}`,
      `Status: ${statusLabels[order.status] ?? order.status}`,
      `Payment: ${order.paymentStatus}`,
      `Total: ${formatMoney(order.totalCents)}`,
      order.fulfillmentType === "delivery" && order.deliveryAddress
        ? `Delivery to: ${order.deliveryAddress}`
        : null,
      order.pickupTime ? `Pickup time: ${order.pickupTime}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

async function startCheckout(phone: string): Promise<BotResult> {
  const cart = await getCart(phone);
  if (cart.length === 0) {
    return reply("Your cart is empty. Reply menu to browse items first.");
  }

  await setConversationStep(phone, "choosing_fulfillment");
  return reply([
    "How would you like to receive your order?",
    "1. Delivery",
    "2. Takeaway / pickup",
  ]);
}

async function handleFulfillmentChoice(phone: string, text: string): Promise<BotResult> {
  if (text === "1" || /delivery/i.test(text)) {
    await setConversationStep(phone, "collecting_address");
    return reply("Please send your full delivery address.");
  }

  if (text === "2" || /takeaway|pickup|collect/i.test(text)) {
    await setConversationStep(phone, "collecting_pickup_time");
    return reply("What time would you like to pick up? Example: 7:30 PM");
  }

  return reply("Reply 1 for delivery or 2 for takeaway.");
}

const draftByPhone = new Map<
  string,
  {
    fulfillmentType: FulfillmentType;
    deliveryAddress?: string;
    pickupTime?: string;
  }
>();

function getDraft(phone: string) {
  return draftByPhone.get(phone);
}

function setDraft(
  phone: string,
  draft: {
    fulfillmentType: FulfillmentType;
    deliveryAddress?: string;
    pickupTime?: string;
  },
) {
  draftByPhone.set(phone, draft);
}

function clearDraft(phone: string) {
  draftByPhone.delete(phone);
}

async function handleOrderConfirmation(phone: string, text: string): Promise<BotResult> {
  if (isNo(text)) {
    clearDraft(phone);
    await setConversationStep(phone, "selecting_items");
    return reply("Order cancelled. Reply menu to continue shopping.");
  }

  if (!isYes(text)) {
    return reply("Reply YES to confirm your order or NO to cancel.");
  }

  const draft = getDraft(phone);
  if (!draft) {
    await setConversationStep(phone, "idle");
    return reply("Something went wrong. Reply checkout to try again.");
  }

  const order = await createOrderFromCart({
    phone,
    fulfillmentType: draft.fulfillmentType,
    deliveryAddress: draft.deliveryAddress,
    pickupTime: draft.pickupTime,
    deliveryFeeCents: restaurantConfig.deliveryFeeCents,
  });

  clearDraft(phone);
  await setConversationStep(phone, "awaiting_payment_screenshot");

  return reply([
    `Order ${formatOrderNumber(order.orderNumber)} created.`,
    formatPaymentInstructions(order.totalCents),
  ]);
}

async function handleCategorySelection(phone: string, text: string): Promise<BotResult> {
  const categories = await getCategories();
  const index = Number(text) - 1;
  if (Number.isNaN(index) || index < 0 || index >= categories.length) {
    return reply("Reply with a valid category number, or type menu.");
  }

  const category = categories[index];
  const items = await getMenuItems(category.id);
  await updateConversation(phone, {
    step: "selecting_items",
    activeCategoryId: category.id,
    shownItemIds: items.map((item) => item.id),
  });

  return reply(await formatCategoryItems(category.id));
}

async function handleItemSelection(phone: string, text: string): Promise<BotResult> {
  const conversation = await getOrCreateConversation(phone);
  const parsed = await parseItemSelection(text, conversation.shownItemIds);
  if (!parsed) {
    return reply(
      "Reply with an item number like 1 or 2x3. Type menu to go back or cart to review.",
    );
  }

  await addToCart(phone, {
    menuItemId: parsed.menuItem.id,
    name: parsed.menuItem.name,
    quantity: parsed.quantity,
    unitPriceCents: parsed.menuItem.priceCents,
  });

  return reply([
    `Added ${parsed.menuItem.name} x${parsed.quantity}.`,
    await formatCartSummary(phone),
  ]);
}

function handleHelp(): BotResult {
  return reply([
    "How to order:",
    "1. Reply menu",
    "2. Choose a category number",
    "3. Add items with numbers like 1x2",
    "4. Reply checkout",
    "5. Choose delivery or takeaway",
    "6. Confirm and pay",
    "7. Send payment screenshot",
    "",
    "Other commands: cart | track | help",
  ]);
}

export async function handleCustomerMessage(input: InboundInput): Promise<BotResult> {
  await ensureStoreReady();
  await getOrCreateCustomer(input.customerPhone);
  const conversation = await getOrCreateConversation(input.customerPhone);
  const text = normalizeText(input.body);

  if (input.mediaUrl) {
    return handlePaymentScreenshot(input);
  }

  if (text === "help") {
    return handleHelp();
  }

  if (text === "track" || text === "status") {
    return handleTrackOrder(input.customerPhone);
  }

  if (text === "cart") {
    return reply(await formatCartSummary(input.customerPhone));
  }

  if (text === "checkout") {
    return startCheckout(input.customerPhone);
  }

  if (text === "menu" || isGreeting(text) || conversation.step === "idle") {
    await setConversationStep(input.customerPhone, "browsing_menu");
    return reply(await formatMenuCategories());
  }

  switch (conversation.step) {
    case "browsing_menu":
      return handleCategorySelection(input.customerPhone, text);
    case "selecting_items":
      if (text === "menu") {
        await setConversationStep(input.customerPhone, "browsing_menu");
        return reply(await formatMenuCategories());
      }
      return handleItemSelection(input.customerPhone, text);
    case "choosing_fulfillment":
      return handleFulfillmentChoice(input.customerPhone, text);
    case "collecting_address": {
      const address = input.body.trim();
      if (address.length < 8) {
        return reply("Please send a complete delivery address with area and landmark.");
      }
      setDraft(input.customerPhone, {
        fulfillmentType: "delivery",
        deliveryAddress: address,
      });
      await updateConversation(input.customerPhone, { step: "confirming_order" });
      return reply(
        await formatOrderSummary({
          phone: input.customerPhone,
          fulfillmentType: "delivery",
          deliveryAddress: address,
        }),
      );
    }
    case "collecting_pickup_time": {
      const pickupTime = input.body.trim();
      if (pickupTime.length < 3) {
        return reply("Please send a pickup time. Example: 7:30 PM");
      }
      setDraft(input.customerPhone, {
        fulfillmentType: "takeaway",
        pickupTime,
      });
      await updateConversation(input.customerPhone, { step: "confirming_order" });
      return reply(
        await formatOrderSummary({
          phone: input.customerPhone,
          fulfillmentType: "takeaway",
          pickupTime,
        }),
      );
    }
    case "confirming_order":
      return handleOrderConfirmation(input.customerPhone, text);
    case "awaiting_payment_screenshot":
      if (isGreeting(text) || text === "menu") {
        return reply(
          "You have a pending payment. Please send your payment screenshot, or reply track for status.",
        );
      }
      return reply("Please send a screenshot of your payment to continue.");
    default:
      return reply(await formatMenuCategories());
  }
}
