import { randomUUID } from "crypto";
import {
  demoCustomers,
  demoOrderEvents,
  demoOrders,
} from "@/data/demo-seed";
import { seedCategories, seedMenuItems } from "@/data/seed-menu";
import {
  branchStoreKey,
  DEFAULT_BRANCH_ID,
} from "@/lib/branch-constants";
import {
  getEffectiveMenuItemById,
  getEffectiveMenuItems,
} from "@/lib/branch-menu";
import { getNextBranchOrderNumber, resetBranchStoreForTests } from "@/lib/branch-store";
import {
  isOrderEditable,
  recalculateOrderTotals,
  shouldResetPaymentAfterEdit,
} from "@/lib/order-edit";
import { initMemoryStoresForTests, resetRestaurantStoreForTests } from "@/lib/restaurant-store";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant-constants";
import type {
  CartLine,
  Conversation,
  ConversationContext,
  ConversationStep,
  Customer,
  FulfillmentType,
  MenuCategory,
  MenuItem,
  Order,
  OrderEvent,
  OrderStatus,
  PaymentStatus,
} from "@/lib/types";

type RestaurantStore = {
  customers: Customer[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
};

type BranchStoreState = {
  conversations: Conversation[];
  carts: Record<string, CartLine[]>;
  orders: Order[];
  orderEvents: OrderEvent[];
};

type TenantStore = {
  restaurantData: Record<string, RestaurantStore>;
  branchData: Record<string, BranchStoreState>;
};

declare global {
  var restaurantOrderingTenantStore: TenantStore | undefined;
}

const now = () => new Date().toISOString();

function shouldSeedDemoData() {
  return process.env.SEED_DEMO_DATA !== "false";
}

function emptyRestaurantStore(): RestaurantStore {
  return {
    customers: [],
    categories: [],
    menuItems: [],
  };
}

function emptyBranchStore(): BranchStoreState {
  return {
    conversations: [],
    carts: {},
    orders: [],
    orderEvents: [],
  };
}

function seedMenuData(store: RestaurantStore) {
  store.categories = seedCategories.map((category) => ({ ...category }));
  store.menuItems = seedMenuItems.map((item) => ({ ...item }));
  return store;
}

export function seedDemoData(branchStore: BranchStoreState) {
  branchStore.orders = demoOrders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item })),
  }));
  branchStore.orderEvents = demoOrderEvents.map((event) => ({ ...event }));
  return branchStore;
}

function getGlobalTenantStore(): TenantStore {
  if (!globalThis.restaurantOrderingTenantStore) {
    globalThis.restaurantOrderingTenantStore = {
      restaurantData: {},
      branchData: {},
    };
  }
  return globalThis.restaurantOrderingTenantStore;
}

export function getRestaurantStore(restaurantId: string): RestaurantStore {
  const global = getGlobalTenantStore();
  if (!global.restaurantData[restaurantId]) {
    const store = emptyRestaurantStore();
    if (restaurantId === DEFAULT_RESTAURANT_ID) {
      seedMenuData(store);
      if (shouldSeedDemoData()) {
        const customers = demoCustomers.map((customer) => ({ ...customer }));
        store.customers = customers;
      }
    }
    global.restaurantData[restaurantId] = store;
  }
  return global.restaurantData[restaurantId];
}

/** @deprecated Use getRestaurantStore for catalog/customers; getBranchStore for operational data. */
export function getTenantStore(restaurantId: string) {
  return getRestaurantStore(restaurantId);
}

export function getBranchStore(restaurantId: string, branchId: string): BranchStoreState {
  const global = getGlobalTenantStore();
  const key = branchStoreKey(restaurantId, branchId);
  if (!global.branchData[key]) {
    const store = emptyBranchStore();
    if (
      restaurantId === DEFAULT_RESTAURANT_ID &&
      branchId === DEFAULT_BRANCH_ID &&
      shouldSeedDemoData()
    ) {
      seedDemoData(store);
    }
    global.branchData[key] = store;
  }
  return global.branchData[key];
}

export function resetStoreForTests() {
  globalThis.restaurantOrderingTenantStore = {
    restaurantData: {},
    branchData: {},
  };
  resetRestaurantStoreForTests();
  resetBranchStoreForTests();
  initMemoryStoresForTests();
}

export function resetDemoData(restaurantId: string, branchId: string) {
  const restaurantStore = getRestaurantStore(restaurantId);
  restaurantStore.customers = demoCustomers.map((customer) => ({ ...customer }));

  const branchStore = emptyBranchStore();
  seedDemoData(branchStore);
  getGlobalTenantStore().branchData[branchStoreKey(restaurantId, branchId)] = branchStore;

  return {
    customers: restaurantStore.customers.length,
    orders: branchStore.orders.length,
    orderEvents: branchStore.orderEvents.length,
  };
}

export function clearConversationForPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  const store = getBranchStore(restaurantId, branchId);
  store.conversations = store.conversations.filter(
    (conversation) => conversation.customerPhone !== phone,
  );
  delete store.carts[phone];
}

export function getDemoStats(restaurantId: string, branchId?: string) {
  const orders = branchId
    ? getBranchStore(restaurantId, branchId).orders
    : Object.entries(getGlobalTenantStore().branchData)
        .filter(([key]) => key.startsWith(`${restaurantId}:`))
        .flatMap(([, store]) => store.orders);
  return {
    orderCount: orders.length,
    pendingPayments: orders.filter((order) => order.status === "payment_uploaded")
      .length,
    activeOrders: orders.filter((order) =>
      ["confirmed", "in_kitchen", "ready", "out_for_delivery"].includes(
        order.status,
      ),
    ).length,
    completedToday: orders.filter((order) => order.status === "completed").length,
  };
}

export function getCategories(restaurantId: string) {
  return [...getRestaurantStore(restaurantId).categories].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export async function getMenuItems(
  restaurantId: string,
  branchId: string,
  categoryId?: string,
) {
  return getEffectiveMenuItems(restaurantId, branchId, categoryId);
}

export function getAllMenuItems(restaurantId: string, categoryId?: string) {
  const items = getRestaurantStore(restaurantId).menuItems;
  if (!categoryId) return items;
  return items.filter((item) => item.categoryId === categoryId);
}

export async function getMenuItemById(
  restaurantId: string,
  branchId: string,
  id: string,
) {
  return getEffectiveMenuItemById(restaurantId, branchId, id);
}

export function upsertMenuItem(restaurantId: string, item: MenuItem) {
  const store = getRestaurantStore(restaurantId);
  const index = store.menuItems.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    store.menuItems[index] = item;
  } else {
    store.menuItems.push(item);
  }
  return item;
}

export function getOrCreateCustomer(restaurantId: string, phone: string): Customer {
  const store = getRestaurantStore(restaurantId);
  const existing = store.customers.find((customer) => customer.phone === phone);
  if (existing) return existing;

  const customer: Customer = {
    id: randomUUID(),
    phone,
    createdAt: now(),
  };
  store.customers.push(customer);
  return customer;
}

export function getOrCreateConversation(
  restaurantId: string,
  branchId: string,
  phone: string,
): Conversation {
  const store = getBranchStore(restaurantId, branchId);
  const existing = store.conversations.find(
    (conversation) => conversation.customerPhone === phone,
  );
  if (existing) return existing;

  const conversation: Conversation = {
    id: randomUUID(),
    customerPhone: phone,
    step: "idle",
    shownItemIds: [],
    context: {},
    createdAt: now(),
    updatedAt: now(),
  };
  store.conversations.push(conversation);
  return conversation;
}

export function updateConversation(
  restaurantId: string,
  branchId: string,
  phone: string,
  patch: Partial<
    Pick<Conversation, "step" | "activeCategoryId" | "shownItemIds" | "context">
  >,
) {
  const conversation = getOrCreateConversation(restaurantId, branchId, phone);
  if (patch.context) {
    conversation.context = { ...conversation.context, ...patch.context };
  }
  Object.assign(conversation, {
    ...patch,
    context: conversation.context,
    updatedAt: now(),
  });
  return conversation;
}

export function getConversationContext(
  restaurantId: string,
  branchId: string,
  phone: string,
): ConversationContext {
  return getOrCreateConversation(restaurantId, branchId, phone).context;
}

export function setConversationContext(
  restaurantId: string,
  branchId: string,
  phone: string,
  context: ConversationContext,
) {
  return updateConversation(restaurantId, branchId, phone, { context });
}

export function getCart(
  restaurantId: string,
  branchId: string,
  phone: string,
): CartLine[] {
  return getBranchStore(restaurantId, branchId).carts[phone] ?? [];
}

export function setCart(
  restaurantId: string,
  branchId: string,
  phone: string,
  items: CartLine[],
) {
  getBranchStore(restaurantId, branchId).carts[phone] = items;
}

export function addToCart(
  restaurantId: string,
  branchId: string,
  phone: string,
  line: CartLine,
) {
  const cart = getCart(restaurantId, branchId, phone);
  const lineKey = line.lineKey ?? line.menuItemId;
  const existing = cart.find((item) => (item.lineKey ?? item.menuItemId) === lineKey);
  if (existing) {
    existing.quantity += line.quantity;
    if (line.notes) existing.notes = line.notes;
  } else {
    cart.push({
      ...line,
      lineKey,
      selectedOptions: line.selectedOptions ?? [],
    });
  }
  setCart(restaurantId, branchId, phone, cart);
  return cart;
}

export function clearCart(restaurantId: string, branchId: string, phone: string) {
  delete getBranchStore(restaurantId, branchId).carts[phone];
}

export function findActiveOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  const activeStatuses: OrderStatus[] = [
    "new",
    "cart_started",
    "awaiting_address",
    "awaiting_pickup_time",
    "awaiting_confirmation",
    "awaiting_payment",
    "payment_uploaded",
    "confirmed",
    "in_kitchen",
    "ready",
    "out_for_delivery",
  ];
  return getBranchStore(restaurantId, branchId).orders.find(
    (order) =>
      order.customerPhone === phone && activeStatuses.includes(order.status),
  );
}

export function findLatestOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  return [...getBranchStore(restaurantId, branchId).orders]
    .filter((order) => order.customerPhone === phone)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function createOrderFromCart(
  restaurantId: string,
  branchId: string,
  input: {
    phone: string;
    fulfillmentType: FulfillmentType;
    deliveryAddress?: string;
    pickupTime?: string;
    deliveryFeeCents: number;
  },
) {
  const cart = getCart(restaurantId, branchId, input.phone);
  if (cart.length === 0) {
    throw new Error("Cart is empty");
  }

  const store = getBranchStore(restaurantId, branchId);
  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const deliveryFeeCents =
    input.fulfillmentType === "delivery" ? input.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;
  const orderNumber = await getNextBranchOrderNumber(branchId);

  const order: Order = {
    id: randomUUID(),
    orderNumber,
    customerPhone: input.phone,
    status: "awaiting_payment",
    paymentStatus: "payment_requested",
    fulfillmentType: input.fulfillmentType,
    deliveryAddress: input.deliveryAddress,
    pickupTime: input.pickupTime,
    items: cart.map((item) => ({ ...item })),
    subtotalCents,
    deliveryFeeCents,
    totalCents,
    createdAt: now(),
    updatedAt: now(),
  };

  store.orders.unshift(order);
  appendOrderEvent(
    restaurantId,
    branchId,
    order.id,
    "awaiting_payment",
    "Order created, awaiting payment",
  );
  clearCart(restaurantId, branchId, input.phone);
  return order;
}

export function appendOrderEvent(
  restaurantId: string,
  branchId: string,
  orderId: string,
  status: OrderStatus,
  note?: string,
) {
  const event: OrderEvent = {
    id: randomUUID(),
    orderId,
    status,
    note,
    createdAt: now(),
  };
  getBranchStore(restaurantId, branchId).orderEvents.unshift(event);
  return event;
}

export function updateOrder(
  restaurantId: string,
  branchId: string,
  orderId: string,
  patch: Partial<
    Pick<
      Order,
      | "status"
      | "paymentStatus"
      | "paymentScreenshotUrl"
      | "paymentVerifiedBy"
      | "paymentVerifiedAt"
      | "paymentRejectionReason"
      | "kitchenAcknowledgedAt"
      | "deliveryAddress"
      | "pickupTime"
      | "fulfillmentType"
      | "notes"
      | "items"
      | "subtotalCents"
      | "deliveryFeeCents"
      | "totalCents"
    >
  >,
  eventNote?: string,
) {
  const store = getBranchStore(restaurantId, branchId);
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error("Order not found");

  Object.assign(order, patch, { updatedAt: now() });
  if (patch.status) {
    appendOrderEvent(restaurantId, branchId, order.id, patch.status, eventNote);
  } else if (eventNote) {
    appendOrderEvent(restaurantId, branchId, order.id, order.status, eventNote);
  }
  return order;
}

export function replaceOrderItems(
  restaurantId: string,
  branchId: string,
  orderId: string,
  items: CartLine[],
  eventNote = "Order items updated",
) {
  const order = getOrderById(restaurantId, branchId, orderId);
  if (!order) throw new Error("Order not found");
  if (!isOrderEditable(order)) throw new Error("Order is not editable");

  const deliveryFeeCents =
    order.fulfillmentType === "delivery" ? order.deliveryFeeCents || 15000 : 0;
  const totals = recalculateOrderTotals(items, order.fulfillmentType, deliveryFeeCents);
  const resetPayment = shouldResetPaymentAfterEdit(order, totals.totalCents);

  const patch: Parameters<typeof updateOrder>[3] = {
    items: items.map((item) => ({ ...item })),
    ...totals,
  };

  if (resetPayment) {
    patch.paymentStatus = "payment_requested";
    patch.status = order.paymentScreenshotUrl ? "payment_uploaded" : "awaiting_payment";
    patch.paymentVerifiedBy = undefined;
    patch.paymentVerifiedAt = undefined;
  }

  return updateOrder(restaurantId, branchId, orderId, patch, eventNote);
}

export function updateOrderDetails(
  restaurantId: string,
  branchId: string,
  orderId: string,
  patch: Partial<
    Pick<Order, "deliveryAddress" | "pickupTime" | "fulfillmentType" | "notes">
  >,
  eventNote = "Order details updated",
) {
  const order = getOrderById(restaurantId, branchId, orderId);
  if (!order) throw new Error("Order not found");
  if (!isOrderEditable(order)) throw new Error("Order is not editable");

  const fulfillmentType = patch.fulfillmentType ?? order.fulfillmentType;
  const deliveryFeeCents =
    fulfillmentType === "delivery" ? order.deliveryFeeCents || 15000 : 0;
  const totals = recalculateOrderTotals(order.items, fulfillmentType, deliveryFeeCents);

  return updateOrder(
    restaurantId,
    branchId,
    orderId,
    {
      ...patch,
      ...totals,
    },
    eventNote,
  );
}

export function cancelOrder(
  restaurantId: string,
  branchId: string,
  orderId: string,
  eventNote = "Order cancelled",
) {
  const order = getOrderById(restaurantId, branchId, orderId);
  if (!order) throw new Error("Order not found");
  if (!isOrderEditable(order)) throw new Error("Order is not editable");
  return updateOrder(restaurantId, branchId, orderId, { status: "cancelled" }, eventNote);
}

export function findEditableOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  const order =
    findActiveOrderByPhone(restaurantId, branchId, phone) ??
    findLatestOrderByPhone(restaurantId, branchId, phone);
  if (!order || !isOrderEditable(order)) return undefined;
  return order;
}

export function listOrders(
  restaurantId: string,
  branchId: string,
  filters?: {
    status?: OrderStatus[];
    paymentStatus?: PaymentStatus[];
    limit?: number;
  },
) {
  let orders = [...getBranchStore(restaurantId, branchId).orders];
  if (filters?.status?.length) {
    orders = orders.filter((order) => filters.status!.includes(order.status));
  }
  if (filters?.paymentStatus?.length) {
    orders = orders.filter((order) =>
      filters.paymentStatus!.includes(order.paymentStatus),
    );
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return orders.slice(0, filters?.limit ?? 100);
}

export function getOrderById(
  restaurantId: string,
  branchId: string,
  orderId: string,
) {
  return getBranchStore(restaurantId, branchId).orders.find(
    (order) => order.id === orderId,
  );
}

export function getOrderEvents(
  restaurantId: string,
  branchId: string,
  orderId: string,
) {
  return getBranchStore(restaurantId, branchId).orderEvents.filter(
    (event) => event.orderId === orderId,
  );
}

export function acknowledgeKitchenOrder(
  restaurantId: string,
  branchId: string,
  orderId: string,
) {
  return updateOrder(
    restaurantId,
    branchId,
    orderId,
    {
      kitchenAcknowledgedAt: now(),
      status: "in_kitchen",
    },
    "Kitchen acknowledged order",
  );
}

export function setConversationStep(
  restaurantId: string,
  branchId: string,
  phone: string,
  step: ConversationStep,
) {
  return updateConversation(restaurantId, branchId, phone, { step });
}
