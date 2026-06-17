import { randomUUID } from "crypto";
import {
  demoCustomers,
  demoOrderEvents,
  demoOrders,
} from "@/data/demo-seed";
import { seedCategories, seedMenuItems } from "@/data/seed-menu";
import type {
  CartLine,
  Conversation,
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

type StoreState = {
  customers: Customer[];
  conversations: Conversation[];
  carts: Record<string, CartLine[]>;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  orderEvents: OrderEvent[];
  nextOrderNumber: number;
};

declare global {
  var restaurantOrderingStore: StoreState | undefined;
}

const now = () => new Date().toISOString();

function shouldSeedDemoData() {
  return process.env.SEED_DEMO_DATA !== "false";
}

function emptyStore(): StoreState {
  return {
    customers: [],
    conversations: [],
    carts: {},
    categories: [...seedCategories],
    menuItems: [...seedMenuItems],
    orders: [],
    orderEvents: [],
    nextOrderNumber: 1001,
  };
}

export function seedDemoData(store: StoreState) {
  store.customers = demoCustomers.map((customer) => ({ ...customer }));
  store.orders = demoOrders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item })),
  }));
  store.orderEvents = demoOrderEvents.map((event) => ({ ...event }));
  store.nextOrderNumber = 1006;
  return store;
}

function initialStore(): StoreState {
  const store = emptyStore();
  if (shouldSeedDemoData()) {
    seedDemoData(store);
  }
  return store;
}

function getStore(): StoreState {
  if (!globalThis.restaurantOrderingStore) {
    globalThis.restaurantOrderingStore = initialStore();
  }
  return globalThis.restaurantOrderingStore;
}

export function resetStoreForTests() {
  globalThis.restaurantOrderingStore = emptyStore();
}

export function resetDemoData() {
  const store = emptyStore();
  seedDemoData(store);
  globalThis.restaurantOrderingStore = store;
  return {
    customers: store.customers.length,
    orders: store.orders.length,
    orderEvents: store.orderEvents.length,
  };
}

export function clearConversationForPhone(phone: string) {
  const store = getStore();
  store.conversations = store.conversations.filter(
    (conversation) => conversation.customerPhone !== phone,
  );
  delete store.carts[phone];
}

export function getDemoStats() {
  const orders = getStore().orders;
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

export function getCategories() {
  return [...getStore().categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getMenuItems(categoryId?: string) {
  const items = getStore().menuItems.filter((item) => item.available);
  if (!categoryId) return items;
  return items.filter((item) => item.categoryId === categoryId);
}

export function getMenuItemById(id: string) {
  return getStore().menuItems.find((item) => item.id === id);
}

export function upsertMenuItem(item: MenuItem) {
  const store = getStore();
  const index = store.menuItems.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    store.menuItems[index] = item;
  } else {
    store.menuItems.push(item);
  }
  return item;
}

export function getOrCreateCustomer(phone: string): Customer {
  const store = getStore();
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

export function getOrCreateConversation(phone: string): Conversation {
  const store = getStore();
  const existing = store.conversations.find(
    (conversation) => conversation.customerPhone === phone,
  );
  if (existing) return existing;

  const conversation: Conversation = {
    id: randomUUID(),
    customerPhone: phone,
    step: "idle",
    shownItemIds: [],
    createdAt: now(),
    updatedAt: now(),
  };
  store.conversations.push(conversation);
  return conversation;
}

export function updateConversation(
  phone: string,
  patch: Partial<Pick<Conversation, "step" | "activeCategoryId" | "shownItemIds">>,
) {
  const conversation = getOrCreateConversation(phone);
  Object.assign(conversation, patch, { updatedAt: now() });
  return conversation;
}

export function getCart(phone: string): CartLine[] {
  return getStore().carts[phone] ?? [];
}

export function setCart(phone: string, items: CartLine[]) {
  getStore().carts[phone] = items;
}

export function addToCart(phone: string, line: CartLine) {
  const cart = getCart(phone);
  const existing = cart.find((item) => item.menuItemId === line.menuItemId);
  if (existing) {
    existing.quantity += line.quantity;
    if (line.notes) existing.notes = line.notes;
  } else {
    cart.push(line);
  }
  setCart(phone, cart);
  return cart;
}

export function clearCart(phone: string) {
  delete getStore().carts[phone];
}

export function findActiveOrderByPhone(phone: string) {
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
  return getStore().orders.find(
    (order) =>
      order.customerPhone === phone && activeStatuses.includes(order.status),
  );
}

export function findLatestOrderByPhone(phone: string) {
  return [...getStore().orders]
    .filter((order) => order.customerPhone === phone)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function createOrderFromCart(input: {
  phone: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  pickupTime?: string;
  deliveryFeeCents: number;
}) {
  const cart = getCart(input.phone);
  if (cart.length === 0) {
    throw new Error("Cart is empty");
  }

  const store = getStore();
  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const deliveryFeeCents =
    input.fulfillmentType === "delivery" ? input.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;
  const orderNumber = store.nextOrderNumber++;

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
  appendOrderEvent(order.id, "awaiting_payment", "Order created, awaiting payment");
  clearCart(input.phone);
  return order;
}

export function appendOrderEvent(orderId: string, status: OrderStatus, note?: string) {
  const event: OrderEvent = {
    id: randomUUID(),
    orderId,
    status,
    note,
    createdAt: now(),
  };
  getStore().orderEvents.unshift(event);
  return event;
}

export function updateOrder(
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
    >
  >,
  eventNote?: string,
) {
  const store = getStore();
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error("Order not found");

  Object.assign(order, patch, { updatedAt: now() });
  if (patch.status) {
    appendOrderEvent(order.id, patch.status, eventNote);
  }
  return order;
}

export function listOrders(filters?: {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  limit?: number;
}) {
  let orders = [...getStore().orders];
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

export function getOrderById(orderId: string) {
  return getStore().orders.find((order) => order.id === orderId);
}

export function getOrderEvents(orderId: string) {
  return getStore().orderEvents.filter((event) => event.orderId === orderId);
}

export function acknowledgeKitchenOrder(orderId: string) {
  return updateOrder(
    orderId,
    {
      kitchenAcknowledgedAt: now(),
      status: "in_kitchen",
    },
    "Kitchen acknowledged order",
  );
}

export function setConversationStep(phone: string, step: ConversationStep) {
  return updateConversation(phone, { step });
}
