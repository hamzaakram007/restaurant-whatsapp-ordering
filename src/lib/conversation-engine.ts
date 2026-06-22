import { formatMoney, formatOrderNumber } from "@/lib/format";
import {
  buildLineKey,
  computeUnitPrice,
  formatCartLineName,
  formatOptionGroupPrompt,
  getPromptableGroups,
} from "@/lib/menu-options";
import { isOrderEditable, shouldResetPaymentAfterEdit } from "@/lib/order-edit";
import { notifyOrderUpdated } from "@/lib/notifications";
import { DEFAULT_BRANCH_ID } from "@/lib/branch-constants";
import { getBranchConfig } from "@/lib/branch-menu";
import { listActiveBranches } from "@/lib/tenant-context";
import {
  addToCart,
  cancelOrder,
  clearCart,
  createOrderFromCart,
  ensureStoreReady,
  findActiveOrderByPhone,
  findEditableOrderByPhone,
  findLatestOrderByPhone,
  getCart,
  getCategories,
  getMenuItemById,
  getMenuItems,
  getOrderById,
  getOrCreateConversation,
  getOrCreateCustomer,
  replaceOrderItems,
  setCart,
  setConversationContext,
  setConversationStep,
  updateConversation,
  updateOrder,
  updateOrderDetails,
} from "@/lib/store";
import type {
  BotResult,
  BranchConfig,
  CheckoutDraft,
  FulfillmentType,
  MenuItem,
  Order,
  PendingItemSelection,
  SelectedOption,
} from "@/lib/types";

export type InboundInput = {
  restaurantId: string;
  customerPhone: string;
  body: string;
  mediaUrl?: string;
  mediaContentType?: string;
  branchId?: string;
  isCentralLine?: boolean;
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

function isSkip(text: string) {
  return /^(skip|none|no thanks|next)/i.test(text);
}

function getConversationBranchId(input: InboundInput) {
  return input.branchId ?? DEFAULT_BRANCH_ID;
}

async function getDraft(
  restaurantId: string,
  branchId: string,
  phone: string,
): Promise<CheckoutDraft | undefined> {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  return conversation.context.checkoutDraft;
}

async function setDraft(
  restaurantId: string,
  branchId: string,
  phone: string,
  draft: CheckoutDraft,
) {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  await setConversationContext(restaurantId, branchId, phone, {
    ...conversation.context,
    checkoutDraft: draft,
  });
}

async function clearDraft(restaurantId: string, branchId: string, phone: string) {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  const rest = { ...conversation.context };
  delete rest.checkoutDraft;
  await setConversationContext(restaurantId, branchId, phone, rest);
}

async function clearPendingItem(restaurantId: string, branchId: string, phone: string) {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  const rest = { ...conversation.context };
  delete rest.pendingItem;
  await setConversationContext(restaurantId, branchId, phone, rest);
}

async function formatMenuCategories(restaurantId: string, config: BranchConfig) {
  const categories = await getCategories(restaurantId);
  const lines = categories.map(
    (category, index) => `${index + 1}. ${category.name}`,
  );
  return [
    `Welcome to ${config.name}!`,
    config.tagline,
    "",
    "Reply with a category number to browse:",
    ...lines,
    "",
    "Commands: cart | checkout | track | edit order | help",
  ].join("\n");
}

async function formatBranchSelection(restaurantId: string) {
  const branches = await listActiveBranches(restaurantId);
  const lines = branches.map((branch, index) => {
    const location = branch.city ? ` (${branch.city})` : "";
    return `${index + 1}. ${branch.name}${location}`;
  });
  return [
    "Which location would you like to order from?",
    ...lines,
    "",
    "Reply with the branch number.",
  ].join("\n");
}

function formatItemPriceHint(item: MenuItem, currency: string) {
  const groups = getPromptableGroups(item);
  if (groups.length === 0) {
    return formatMoney(item.priceCents, currency);
  }
  const maxDelta = groups.reduce((sum, group) => {
    const maxInGroup = Math.max(...group.choices.map((choice) => choice.priceDeltaCents), 0);
    return sum + maxInGroup;
  }, 0);
  if (maxDelta === 0) {
    return `from ${formatMoney(item.priceCents, currency)}`;
  }
  return `from ${formatMoney(item.priceCents, currency)}`;
}

async function formatCategoryItems(
  restaurantId: string,
  branchId: string,
  categoryId: string,
  currency: string,
) {
  const items = await getMenuItems(restaurantId, branchId, categoryId);
  if (items.length === 0) {
    return "No items are available in this category right now.";
  }

  const lines = items.map(
    (item, index) =>
      `${index + 1}. ${item.name} - ${formatItemPriceHint(item, currency)}\n   ${item.description}`,
  );

  return [
    "Add items by replying with: <number> or <number>x<qty>",
    "Example: 1x2 adds two of item 1",
    "Items with sizes or add-ons will ask follow-up questions.",
    "",
    ...lines,
    "",
    "Reply menu to go back | cart to view cart | checkout when ready",
  ].join("\n");
}

async function formatCartSummary(
  restaurantId: string,
  branchId: string,
  phone: string,
  currency: string,
) {
  const cart = await getCart(restaurantId, branchId, phone);
  if (cart.length === 0) {
    return "Your cart is empty. Reply menu to browse categories.";
  }

  const lines = cart.map(
    (item) =>
      `- ${item.name} x${item.quantity} = ${formatMoney(item.unitPriceCents * item.quantity, currency)}`,
  );
  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  return [
    "Your cart:",
    ...lines,
    "",
    `Subtotal: ${formatMoney(subtotal, currency)}`,
    "",
    "Reply checkout to continue or menu to add more items.",
  ].join("\n");
}

function formatPaymentInstructions(config: BranchConfig, orderTotalCents: number) {
  const { payment, currency } = config;
  return [
    `Total due: ${formatMoney(orderTotalCents, currency)}`,
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

async function formatOrderSummary(
  restaurantId: string,
  branchId: string,
  config: BranchConfig,
  input: {
    fulfillmentType: FulfillmentType;
    deliveryAddress?: string;
    pickupTime?: string;
    phone: string;
  },
) {
  const cart = await getCart(restaurantId, branchId, input.phone);
  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const deliveryFeeCents =
    input.fulfillmentType === "delivery" ? config.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  const lines = cart.map(
    (item) => `- ${item.name} x${item.quantity} (${formatMoney(item.unitPriceCents, config.currency)})`,
  );

  return [
    "Order summary:",
    ...lines,
    "",
    `Subtotal: ${formatMoney(subtotalCents, config.currency)}`,
    input.fulfillmentType === "delivery"
      ? `Delivery fee: ${formatMoney(deliveryFeeCents, config.currency)}`
      : "Pickup: no delivery fee",
    `Total: ${formatMoney(totalCents, config.currency)}`,
    `Type: ${input.fulfillmentType === "delivery" ? "Delivery" : "Takeaway"}`,
    input.deliveryAddress ? `Address: ${input.deliveryAddress}` : null,
    input.pickupTime ? `Pickup time: ${input.pickupTime}` : null,
    "",
    "Reply YES to confirm or NO to cancel.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function parseItemSelection(
  restaurantId: string,
  branchId: string,
  text: string,
  shownItemIds: string[],
) {
  const match = text.match(/^(\d+)\s*(?:x\s*(\d+))?$/i);
  if (!match) return null;

  const index = Number(match[1]) - 1;
  const quantity = match[2] ? Number(match[2]) : 1;
  if (index < 0 || index >= shownItemIds.length || quantity < 1) return null;

  const menuItem = await getMenuItemById(restaurantId, branchId, shownItemIds[index]);
  if (!menuItem || !menuItem.available) return null;

  return { menuItem, quantity };
}

async function finalizePendingItem(
  restaurantId: string,
  branchId: string,
  phone: string,
  pending: PendingItemSelection,
) {
  const menuItem = await getMenuItemById(restaurantId, branchId, pending.menuItemId);
  if (!menuItem) {
    await clearPendingItem(restaurantId, branchId, phone);
    await setConversationStep(restaurantId, branchId, phone, "selecting_items");
    return reply("That item is no longer available. Reply menu to browse again.");
  }

  const unitPriceCents = computeUnitPrice(menuItem.priceCents, pending.selectedOptions);
  const name = formatCartLineName(menuItem.name, pending.selectedOptions);
  const lineKey = buildLineKey(menuItem.id, pending.selectedOptions);

  await addToCart(restaurantId, branchId, phone, {
    menuItemId: menuItem.id,
    name,
    quantity: pending.quantity,
    unitPriceCents,
    lineKey,
    selectedOptions: pending.selectedOptions,
  });

  await clearPendingItem(restaurantId, branchId, phone);
  await setConversationStep(restaurantId, branchId, phone, "selecting_items");
  const config = await getBranchConfig(restaurantId, branchId);

  return reply([
    `Added ${name} x${pending.quantity}.`,
    await formatCartSummary(restaurantId, branchId, phone, config.currency),
  ]);
}

async function startItemOptionFlow(
  restaurantId: string,
  branchId: string,
  phone: string,
  menuItem: MenuItem,
  quantity: number,
) {
  const groups = getPromptableGroups(menuItem);
  const pending: PendingItemSelection = {
    menuItemId: menuItem.id,
    quantity,
    groupIndex: 0,
    selectedOptions: [],
  };

  await setConversationContext(restaurantId, branchId, phone, {
    ...(await getOrCreateConversation(restaurantId, branchId, phone)).context,
    pendingItem: pending,
  });
  await setConversationStep(restaurantId, branchId, phone, "selecting_item_options");

  return reply(formatOptionGroupPrompt(groups[0], menuItem.name));
}

async function handlePaymentScreenshot(
  input: InboundInput,
  branchId: string,
): Promise<BotResult> {
  const { restaurantId } = input;
  const order = await findActiveOrderByPhone(restaurantId, branchId, input.customerPhone);
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

  await updateOrder(
    restaurantId,
    branchId,
    order.id,
    {
      status: "payment_uploaded",
      paymentScreenshotUrl: input.mediaUrl,
    },
  );
  await setConversationStep(restaurantId, branchId, input.customerPhone, "idle");

  return reply(
    `Payment screenshot received for order ${formatOrderNumber(order.orderNumber)}. Our team will verify it shortly. You will get a WhatsApp update once confirmed.`,
  );
}

async function clearEditingOrder(restaurantId: string, branchId: string, phone: string) {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  const rest = { ...conversation.context };
  delete rest.editingOrderId;
  await setConversationContext(restaurantId, branchId, phone, rest);
}

function formatEditOrderMenu(order: Order) {
  return [
    `Editing order ${formatOrderNumber(order.orderNumber)}.`,
    "What would you like to change?",
    "1. Change items",
    order.fulfillmentType === "delivery"
      ? "2. Change delivery address"
      : "2. Change pickup time",
    "3. Add or change note",
    "4. Cancel order",
    "",
    "Reply track for status or menu to browse.",
  ].join("\n");
}

async function startEditOrder(
  restaurantId: string,
  branchId: string,
  phone: string,
): Promise<BotResult> {
  const order = await findEditableOrderByPhone(restaurantId, branchId, phone);
  if (!order) {
    const latest = await findLatestOrderByPhone(restaurantId, branchId, phone);
    if (latest && !isOrderEditable(latest)) {
      return reply(
        `Order ${formatOrderNumber(latest.orderNumber)} is already in the kitchen and cannot be changed. Reply track for status.`,
      );
    }
    return reply("No editable order found. Reply menu to place a new order.");
  }

  await setConversationContext(restaurantId, branchId, phone, {
    ...(await getOrCreateConversation(restaurantId, branchId, phone)).context,
    editingOrderId: order.id,
  });
  await setConversationStep(restaurantId, branchId, phone, "editing_order");
  return reply(formatEditOrderMenu(order));
}

async function saveEditedOrderItems(
  restaurantId: string,
  branchId: string,
  phone: string,
): Promise<BotResult> {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  const orderId = conversation.context.editingOrderId;
  if (!orderId) {
    return reply(
      "Reply checkout to place a new order, or edit order to modify an existing one.",
    );
  }

  const existing = await getOrderById(restaurantId, branchId, orderId);
  if (!existing || !isOrderEditable(existing)) {
    await clearEditingOrder(restaurantId, branchId, phone);
    await clearCart(restaurantId, branchId, phone);
    await setConversationStep(restaurantId, branchId, phone, "idle");
    return reply("That order can no longer be edited. Reply track for status.");
  }

  const cart = await getCart(restaurantId, branchId, phone);
  if (cart.length === 0) {
    return reply("Your cart is empty. Add items before saving.");
  }

  const wasPaid = existing.paymentStatus === "paid";
  const updated = await replaceOrderItems(
    restaurantId,
    branchId,
    orderId,
    cart,
    "Order updated by customer",
  );
  const paymentReset =
    wasPaid && shouldResetPaymentAfterEdit(existing, updated.totalCents);

  await notifyOrderUpdated(restaurantId, phone, updated.orderNumber, {
    totalCents: updated.totalCents,
    paymentReset,
  }, branchId);

  await clearCart(restaurantId, branchId, phone);
  await clearEditingOrder(restaurantId, branchId, phone);
  await setConversationStep(restaurantId, branchId, phone, "idle");
  const config = await getBranchConfig(restaurantId, branchId);

  return reply(
    [
      `Order ${formatOrderNumber(updated.orderNumber)} updated.`,
      `New total: ${formatMoney(updated.totalCents, config.currency)}`,
      paymentReset
        ? "Please send an updated payment screenshot for the new total."
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

async function handleEditingOrder(
  restaurantId: string,
  branchId: string,
  phone: string,
  text: string,
): Promise<BotResult> {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  const orderId = conversation.context.editingOrderId;
  if (!orderId) {
    await setConversationStep(restaurantId, branchId, phone, "idle");
    return reply("No order is being edited. Reply edit order to start.");
  }

  const order = await getOrderById(restaurantId, branchId, orderId);
  if (!order || !isOrderEditable(order)) {
    await clearEditingOrder(restaurantId, branchId, phone);
    await setConversationStep(restaurantId, branchId, phone, "idle");
    return reply("That order can no longer be edited. Reply track for status.");
  }

  if (text === "1") {
    await setCart(
      restaurantId,
      branchId,
      phone,
      order.items.map((item) => ({
        ...item,
        selectedOptions: item.selectedOptions.map((option) => ({ ...option })),
      })),
    );
    await setConversationStep(restaurantId, branchId, phone, "selecting_items");
    const config = await getBranchConfig(restaurantId, branchId);
    return reply([
      "Your order items are loaded into your cart.",
      await formatCartSummary(restaurantId, branchId, phone, config.currency),
      "",
      "Add or remove items, then reply save to update your order.",
    ]);
  }

  if (text === "2") {
    if (order.fulfillmentType === "delivery") {
      await setConversationStep(restaurantId, branchId, phone, "collecting_address");
      return reply("Send your updated delivery address.");
    }
    await setConversationStep(restaurantId, branchId, phone, "collecting_pickup_time");
    return reply("Send your updated pickup time. Example: 7:30 PM");
  }

  if (text === "3") {
    await setConversationStep(restaurantId, branchId, phone, "editing_order_note");
    return reply(
      order.notes
        ? `Current note: ${order.notes}\n\nSend your new note, or type clear to remove it.`
        : "Send a note for your order (special instructions).",
    );
  }

  if (text === "4") {
    await setConversationStep(restaurantId, branchId, phone, "editing_order_confirm_cancel");
    return reply("Reply YES to cancel this order, or NO to go back.");
  }

  return reply("Reply 1, 2, 3, or 4. Type menu to go back.");
}

async function handleTrackOrder(
  restaurantId: string,
  branchId: string,
  phone: string,
): Promise<BotResult> {
  const order = await findLatestOrderByPhone(restaurantId, branchId, phone);
  if (!order) {
    return reply("No orders found yet. Reply menu to place your first order.");
  }
  const config = await getBranchConfig(restaurantId, branchId);

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
      `Total: ${formatMoney(order.totalCents, config.currency)}`,
      order.fulfillmentType === "delivery" && order.deliveryAddress
        ? `Delivery to: ${order.deliveryAddress}`
        : null,
      order.pickupTime ? `Pickup time: ${order.pickupTime}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

async function startCheckout(
  restaurantId: string,
  branchId: string,
  phone: string,
): Promise<BotResult> {
  const cart = await getCart(restaurantId, branchId, phone);
  if (cart.length === 0) {
    return reply("Your cart is empty. Reply menu to browse items first.");
  }

  await setConversationStep(restaurantId, branchId, phone, "choosing_fulfillment");
  return reply([
    "How would you like to receive your order?",
    "1. Delivery",
    "2. Takeaway / pickup",
  ]);
}

async function handleFulfillmentChoice(
  restaurantId: string,
  branchId: string,
  phone: string,
  text: string,
): Promise<BotResult> {
  if (text === "1" || /delivery/i.test(text)) {
    await setConversationStep(restaurantId, branchId, phone, "collecting_address");
    return reply("Please send your full delivery address.");
  }

  if (text === "2" || /takeaway|pickup|collect/i.test(text)) {
    await setConversationStep(restaurantId, branchId, phone, "collecting_pickup_time");
    return reply("What time would you like to pick up? Example: 7:30 PM");
  }

  return reply("Reply 1 for delivery or 2 for takeaway.");
}

async function handleOrderConfirmation(
  restaurantId: string,
  branchId: string,
  config: BranchConfig,
  phone: string,
  text: string,
): Promise<BotResult> {
  if (isNo(text)) {
    await clearDraft(restaurantId, branchId, phone);
    await setConversationStep(restaurantId, branchId, phone, "selecting_items");
    return reply("Order cancelled. Reply menu to continue shopping.");
  }

  if (!isYes(text)) {
    return reply("Reply YES to confirm your order or NO to cancel.");
  }

  const draft = await getDraft(restaurantId, branchId, phone);
  if (!draft) {
    await setConversationStep(restaurantId, branchId, phone, "idle");
    return reply("Something went wrong. Reply checkout to try again.");
  }

  const order = await createOrderFromCart(restaurantId, branchId, {
    phone,
    fulfillmentType: draft.fulfillmentType,
    deliveryAddress: draft.deliveryAddress,
    pickupTime: draft.pickupTime,
    deliveryFeeCents: config.deliveryFeeCents,
  });

  await clearDraft(restaurantId, branchId, phone);
  await setConversationStep(restaurantId, branchId, phone, "awaiting_payment_screenshot");

  return reply([
    `Order ${formatOrderNumber(order.orderNumber)} created.`,
    formatPaymentInstructions(config, order.totalCents),
  ]);
}

async function handleCategorySelection(
  restaurantId: string,
  branchId: string,
  phone: string,
  text: string,
): Promise<BotResult> {
  const categories = await getCategories(restaurantId);
  const index = Number(text) - 1;
  if (Number.isNaN(index) || index < 0 || index >= categories.length) {
    return reply("Reply with a valid category number, or type menu.");
  }

  const category = categories[index];
  const items = await getMenuItems(restaurantId, branchId, category.id);
  const config = await getBranchConfig(restaurantId, branchId);
  await updateConversation(restaurantId, branchId, phone, {
    step: "selecting_items",
    activeCategoryId: category.id,
    shownItemIds: items.map((item) => item.id),
  });

  return reply(await formatCategoryItems(restaurantId, branchId, category.id, config.currency));
}

async function handleItemSelection(
  restaurantId: string,
  branchId: string,
  phone: string,
  text: string,
): Promise<BotResult> {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  const parsed = await parseItemSelection(
    restaurantId,
    branchId,
    text,
    conversation.shownItemIds,
  );
  if (!parsed) {
    return reply(
      "Reply with an item number like 1 or 2x3. Type menu to go back or cart to review.",
    );
  }

  const groups = getPromptableGroups(parsed.menuItem);
  if (groups.length > 0) {
    return startItemOptionFlow(restaurantId, branchId, phone, parsed.menuItem, parsed.quantity);
  }

  await addToCart(restaurantId, branchId, phone, {
    menuItemId: parsed.menuItem.id,
    name: parsed.menuItem.name,
    quantity: parsed.quantity,
    unitPriceCents: parsed.menuItem.priceCents,
    lineKey: parsed.menuItem.id,
    selectedOptions: [],
  });
  const config = await getBranchConfig(restaurantId, branchId);

  return reply([
    `Added ${parsed.menuItem.name} x${parsed.quantity}.`,
    await formatCartSummary(restaurantId, branchId, phone, config.currency),
  ]);
}

async function handleItemOptionSelection(
  restaurantId: string,
  branchId: string,
  config: BranchConfig,
  phone: string,
  text: string,
): Promise<BotResult> {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  const pending = conversation.context.pendingItem;
  if (!pending) {
    await setConversationStep(restaurantId, branchId, phone, "selecting_items");
    return reply("No item is waiting for options. Reply with an item number to add.");
  }

  const menuItem = await getMenuItemById(restaurantId, branchId, pending.menuItemId);
  if (!menuItem) {
    await clearPendingItem(restaurantId, branchId, phone);
    await setConversationStep(restaurantId, branchId, phone, "selecting_items");
    return reply("That item is no longer available. Reply menu to browse again.");
  }

  const groups = getPromptableGroups(menuItem);
  const currentGroup = groups[pending.groupIndex];
  if (!currentGroup) {
    return finalizePendingItem(restaurantId, branchId, phone, pending);
  }

  if (text === "menu") {
    await clearPendingItem(restaurantId, branchId, phone);
    await setConversationStep(restaurantId, branchId, phone, "browsing_menu");
    return reply(await formatMenuCategories(restaurantId, config));
  }

  if (text === "cart") {
    await clearPendingItem(restaurantId, branchId, phone);
    await setConversationStep(restaurantId, branchId, phone, "selecting_items");
    return reply(await formatCartSummary(restaurantId, branchId, phone, config.currency));
  }

  let selectedOptions = [...pending.selectedOptions];

  if (isSkip(text)) {
    if (currentGroup.required) {
      return reply(
        `${currentGroup.name} is required. Reply with a number from the list.`,
      );
    }
  } else {
    const choiceIndex = Number(text) - 1;
    if (Number.isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= currentGroup.choices.length) {
      return reply(
        `Reply with a valid option number for ${currentGroup.name.toLowerCase()}, or type skip for optional choices.`,
      );
    }

    const choice = currentGroup.choices[choiceIndex];
    const option: SelectedOption = {
      groupId: currentGroup.id,
      choiceId: choice.id,
      label: choice.label,
      priceDeltaCents: choice.priceDeltaCents,
    };
    selectedOptions = [
      ...selectedOptions.filter((entry) => entry.groupId !== currentGroup.id),
      option,
    ];
  }

  const nextIndex = pending.groupIndex + 1;
  if (nextIndex >= groups.length) {
    return finalizePendingItem(restaurantId, branchId, phone, {
      ...pending,
      selectedOptions,
    });
  }

  const nextPending: PendingItemSelection = {
    ...pending,
    groupIndex: nextIndex,
    selectedOptions,
  };

  await setConversationContext(restaurantId, branchId, phone, {
    ...conversation.context,
    pendingItem: nextPending,
  });

  return reply(formatOptionGroupPrompt(groups[nextIndex], menuItem.name));
}

async function handleBranchSelection(
  restaurantId: string,
  conversationBranchId: string,
  phone: string,
  text: string,
): Promise<BotResult> {
  const branches = await listActiveBranches(restaurantId);
  const index = Number(text) - 1;
  if (Number.isNaN(index) || index < 0 || index >= branches.length) {
    return reply([
      "Reply with a valid branch number.",
      await formatBranchSelection(restaurantId),
    ]);
  }

  const branch = branches[index]!;
  const conversation = await getOrCreateConversation(restaurantId, conversationBranchId, phone);
  await setConversationContext(restaurantId, conversationBranchId, phone, {
    ...conversation.context,
    branchId: branch.id,
  });
  await setConversationStep(restaurantId, conversationBranchId, phone, "browsing_menu");

  const config = await getBranchConfig(restaurantId, branch.id);
  return reply([
    `Ordering from ${branch.name}.`,
    await formatMenuCategories(restaurantId, config),
  ]);
}

function handleHelp(): BotResult {
  return reply([
    "How to order:",
    "1. Reply menu",
    "2. Choose a category number",
    "3. Add items with numbers like 1x2",
    "4. Choose size and add-ons when asked",
    "5. Reply checkout",
    "6. Choose delivery or takeaway",
    "7. Confirm and pay",
    "8. Send payment screenshot",
    "",
    "Other commands: cart | track | edit order | help",
  ]);
}

export async function handleCustomerMessage(input: InboundInput): Promise<BotResult> {
  const { restaurantId, customerPhone } = input;
  const conversationBranchId = getConversationBranchId(input);
  await ensureStoreReady(restaurantId, conversationBranchId);
  await getOrCreateCustomer(restaurantId, customerPhone);
  const conversation = await getOrCreateConversation(
    restaurantId,
    conversationBranchId,
    customerPhone,
  );
  const effectiveBranchId = input.branchId ?? conversation.context.branchId;
  const needsBranchSelection = input.isCentralLine && !effectiveBranchId;
  const text = normalizeText(input.body);

  if (needsBranchSelection) {
    if (text === "help") {
      return handleHelp();
    }
    if (conversation.step === "choosing_branch") {
      return handleBranchSelection(restaurantId, conversationBranchId, customerPhone, text);
    }
    await setConversationStep(restaurantId, conversationBranchId, customerPhone, "choosing_branch");
    return reply(await formatBranchSelection(restaurantId));
  }

  const branchId = effectiveBranchId!;
  const config = await getBranchConfig(restaurantId, branchId);

  if (input.mediaUrl) {
    return handlePaymentScreenshot(input, branchId);
  }

  if (text === "help") {
    return handleHelp();
  }

  if (text === "track" || text === "status") {
    return handleTrackOrder(restaurantId, branchId, customerPhone);
  }

  if (text === "edit order" || text === "change order") {
    return startEditOrder(restaurantId, branchId, customerPhone);
  }

  if (text === "cart") {
    return reply(await formatCartSummary(restaurantId, branchId, customerPhone, config.currency));
  }

  if (text === "checkout") {
    const editingOrderId = conversation.context.editingOrderId;
    if (editingOrderId) {
      return reply(
        "You are editing an existing order. Reply save when your cart is ready.",
      );
    }
    return startCheckout(restaurantId, branchId, customerPhone);
  }

  if (text === "menu" || isGreeting(text) || conversation.step === "idle") {
    await clearPendingItem(restaurantId, branchId, customerPhone);
    await setConversationStep(restaurantId, branchId, customerPhone, "browsing_menu");
    return reply(await formatMenuCategories(restaurantId, config));
  }

  switch (conversation.step) {
    case "choosing_branch":
      return handleBranchSelection(restaurantId, conversationBranchId, customerPhone, text);
    case "browsing_menu":
      return handleCategorySelection(restaurantId, branchId, customerPhone, text);
    case "selecting_items":
      if (text === "save" && conversation.context.editingOrderId) {
        return saveEditedOrderItems(restaurantId, branchId, customerPhone);
      }
      if (text === "menu") {
        await setConversationStep(restaurantId, branchId, customerPhone, "browsing_menu");
        return reply(await formatMenuCategories(restaurantId, config));
      }
      return handleItemSelection(restaurantId, branchId, customerPhone, text);
    case "selecting_item_options":
      return handleItemOptionSelection(restaurantId, branchId, config, customerPhone, text);
    case "editing_order":
      return handleEditingOrder(restaurantId, branchId, customerPhone, text);
    case "editing_order_note": {
      const orderId = conversation.context.editingOrderId;
      if (!orderId) {
        await setConversationStep(restaurantId, branchId, customerPhone, "idle");
        return reply("No order is being edited.");
      }
      const noteText = text === "clear" ? "" : input.body.trim();
      const updated = await updateOrderDetails(
        restaurantId,
        branchId,
        orderId,
        { notes: noteText || undefined },
        "Order updated by customer",
      );
      await notifyOrderUpdated(restaurantId, customerPhone, updated.orderNumber, {
        totalCents: updated.totalCents,
      }, branchId);
      await setConversationStep(restaurantId, branchId, customerPhone, "editing_order");
      return reply(
        noteText
          ? `Note saved for order ${formatOrderNumber(updated.orderNumber)}.`
          : `Note removed from order ${formatOrderNumber(updated.orderNumber)}.`,
      );
    }
    case "editing_order_confirm_cancel": {
      if (isNo(text)) {
        const order = conversation.context.editingOrderId
          ? await getOrderById(restaurantId, branchId, conversation.context.editingOrderId)
          : undefined;
        await setConversationStep(restaurantId, branchId, customerPhone, "editing_order");
        return reply(order ? formatEditOrderMenu(order) : "Reply edit order to start.");
      }
      if (!isYes(text)) {
        return reply("Reply YES to cancel this order, or NO to go back.");
      }
      const orderId = conversation.context.editingOrderId;
      if (!orderId) {
        await setConversationStep(restaurantId, branchId, customerPhone, "idle");
        return reply("No order is being edited.");
      }
      const updated = await cancelOrder(restaurantId, branchId, orderId, "Order cancelled by customer");
      await notifyOrderUpdated(restaurantId, customerPhone, updated.orderNumber, {
        cancelled: true,
      }, branchId);
      await clearEditingOrder(restaurantId, branchId, customerPhone);
      await clearCart(restaurantId, branchId, customerPhone);
      await setConversationStep(restaurantId, branchId, customerPhone, "idle");
      return reply(
        `Order ${formatOrderNumber(updated.orderNumber)} has been cancelled.`,
      );
    }
    case "choosing_fulfillment":
      return handleFulfillmentChoice(restaurantId, branchId, customerPhone, text);
    case "collecting_address": {
      const address = input.body.trim();
      if (address.length < 8) {
        return reply("Please send a complete delivery address with area and landmark.");
      }
      if (conversation.context.editingOrderId) {
        const updated = await updateOrderDetails(
          restaurantId,
          branchId,
          conversation.context.editingOrderId,
          { deliveryAddress: address },
          "Order updated by customer",
        );
        await notifyOrderUpdated(restaurantId, customerPhone, updated.orderNumber, {
          totalCents: updated.totalCents,
        }, branchId);
        await setConversationStep(restaurantId, branchId, customerPhone, "editing_order");
        return reply(
          `Address updated for order ${formatOrderNumber(updated.orderNumber)}.`,
        );
      }
      await setDraft(restaurantId, branchId, customerPhone, {
        fulfillmentType: "delivery",
        deliveryAddress: address,
      });
      await updateConversation(restaurantId, branchId, customerPhone, { step: "confirming_order" });
      return reply(
        await formatOrderSummary(restaurantId, branchId, config, {
          phone: customerPhone,
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
      if (conversation.context.editingOrderId) {
        const updated = await updateOrderDetails(
          restaurantId,
          branchId,
          conversation.context.editingOrderId,
          { pickupTime },
          "Order updated by customer",
        );
        await notifyOrderUpdated(restaurantId, customerPhone, updated.orderNumber, {
          totalCents: updated.totalCents,
        }, branchId);
        await setConversationStep(restaurantId, branchId, customerPhone, "editing_order");
        return reply(
          `Pickup time updated for order ${formatOrderNumber(updated.orderNumber)}.`,
        );
      }
      await setDraft(restaurantId, branchId, customerPhone, {
        fulfillmentType: "takeaway",
        pickupTime,
      });
      await updateConversation(restaurantId, branchId, customerPhone, { step: "confirming_order" });
      return reply(
        await formatOrderSummary(restaurantId, branchId, config, {
          phone: customerPhone,
          fulfillmentType: "takeaway",
          pickupTime,
        }),
      );
    }
    case "confirming_order":
      return handleOrderConfirmation(restaurantId, branchId, config, customerPhone, text);
    case "awaiting_payment_screenshot":
      if (isGreeting(text) || text === "menu") {
        return reply(
          "You have a pending payment. Please send your payment screenshot, or reply track for status.",
        );
      }
      return reply("Please send a screenshot of your payment to continue.");
    default:
      return reply(await formatMenuCategories(restaurantId, config));
  }
}
