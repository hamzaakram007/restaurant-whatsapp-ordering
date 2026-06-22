import { DEFAULT_BRANCH_ID } from "@/lib/branch-constants";
import { ensureDefaultBranch } from "@/lib/branch-store";
import { isDatabaseEnabled } from "@/lib/db";
import * as memory from "@/lib/store-memory";
import * as postgres from "@/lib/store-postgres";

function isPostgresBackend() {
  return isDatabaseEnabled();
}

export function getStorageMode() {
  return isPostgresBackend() ? "neon-postgres" : "in-memory-demo";
}

export async function ensureStoreReady(restaurantId: string, branchId = DEFAULT_BRANCH_ID) {
  await ensureDefaultBranch(restaurantId);
  if (isPostgresBackend()) {
    await postgres.ensureDemoDataIfNeeded(restaurantId, branchId);
  }
}

export function resetStoreForTests() {
  memory.resetStoreForTests();
}

export async function resetDemoData(restaurantId: string, branchId: string) {
  return isPostgresBackend()
    ? postgres.resetDemoData(restaurantId, branchId)
    : memory.resetDemoData(restaurantId, branchId);
}

export async function clearConversationForPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  return isPostgresBackend()
    ? postgres.clearConversationForPhone(restaurantId, branchId, phone)
    : memory.clearConversationForPhone(restaurantId, branchId, phone);
}

export async function getDemoStats(restaurantId: string, branchId?: string) {
  return isPostgresBackend()
    ? postgres.getDemoStats(restaurantId, branchId)
    : memory.getDemoStats(restaurantId, branchId);
}

export async function getCategories(restaurantId: string) {
  return isPostgresBackend()
    ? postgres.getCategories(restaurantId)
    : memory.getCategories(restaurantId);
}

export async function getMenuItems(
  restaurantId: string,
  branchId: string,
  categoryId?: string,
) {
  return isPostgresBackend()
    ? postgres.getMenuItems(restaurantId, branchId, categoryId)
    : memory.getMenuItems(restaurantId, branchId, categoryId);
}

export async function getAllMenuItems(restaurantId: string, categoryId?: string) {
  return isPostgresBackend()
    ? postgres.getAllMenuItems(restaurantId, categoryId)
    : memory.getAllMenuItems(restaurantId, categoryId);
}

export async function getMenuItemById(
  restaurantId: string,
  branchId: string,
  id: string,
) {
  return isPostgresBackend()
    ? postgres.getMenuItemById(restaurantId, branchId, id)
    : memory.getMenuItemById(restaurantId, branchId, id);
}

export async function upsertMenuItem(
  restaurantId: string,
  item: Parameters<typeof memory.upsertMenuItem>[1],
) {
  return isPostgresBackend()
    ? postgres.upsertMenuItem(restaurantId, item)
    : memory.upsertMenuItem(restaurantId, item);
}

export async function getOrCreateCustomer(restaurantId: string, phone: string) {
  return isPostgresBackend()
    ? postgres.getOrCreateCustomer(restaurantId, phone)
    : memory.getOrCreateCustomer(restaurantId, phone);
}

export async function getOrCreateConversation(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  return isPostgresBackend()
    ? postgres.getOrCreateConversation(restaurantId, branchId, phone)
    : memory.getOrCreateConversation(restaurantId, branchId, phone);
}

export async function updateConversation(
  restaurantId: string,
  branchId: string,
  phone: string,
  patch: Parameters<typeof memory.updateConversation>[3],
) {
  return isPostgresBackend()
    ? postgres.updateConversation(restaurantId, branchId, phone, patch)
    : memory.updateConversation(restaurantId, branchId, phone, patch);
}

export async function getConversationContext(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  return isPostgresBackend()
    ? postgres.getConversationContext(restaurantId, branchId, phone)
    : memory.getConversationContext(restaurantId, branchId, phone);
}

export async function setConversationContext(
  restaurantId: string,
  branchId: string,
  phone: string,
  context: Parameters<typeof memory.setConversationContext>[3],
) {
  return isPostgresBackend()
    ? postgres.setConversationContext(restaurantId, branchId, phone, context)
    : memory.setConversationContext(restaurantId, branchId, phone, context);
}

export async function getCart(restaurantId: string, branchId: string, phone: string) {
  return isPostgresBackend()
    ? postgres.getCart(restaurantId, branchId, phone)
    : memory.getCart(restaurantId, branchId, phone);
}

export async function setCart(
  restaurantId: string,
  branchId: string,
  phone: string,
  items: Parameters<typeof memory.setCart>[3],
) {
  return isPostgresBackend()
    ? postgres.setCart(restaurantId, branchId, phone, items)
    : memory.setCart(restaurantId, branchId, phone, items);
}

export async function addToCart(
  restaurantId: string,
  branchId: string,
  phone: string,
  line: Parameters<typeof memory.addToCart>[3],
) {
  return isPostgresBackend()
    ? postgres.addToCart(restaurantId, branchId, phone, line)
    : memory.addToCart(restaurantId, branchId, phone, line);
}

export async function clearCart(restaurantId: string, branchId: string, phone: string) {
  return isPostgresBackend()
    ? postgres.clearCart(restaurantId, branchId, phone)
    : memory.clearCart(restaurantId, branchId, phone);
}

export async function findActiveOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  return isPostgresBackend()
    ? postgres.findActiveOrderByPhone(restaurantId, branchId, phone)
    : memory.findActiveOrderByPhone(restaurantId, branchId, phone);
}

export async function findLatestOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  return isPostgresBackend()
    ? postgres.findLatestOrderByPhone(restaurantId, branchId, phone)
    : memory.findLatestOrderByPhone(restaurantId, branchId, phone);
}

export async function createOrderFromCart(
  restaurantId: string,
  branchId: string,
  input: Parameters<typeof memory.createOrderFromCart>[2],
) {
  return isPostgresBackend()
    ? postgres.createOrderFromCart(restaurantId, branchId, input)
    : memory.createOrderFromCart(restaurantId, branchId, input);
}

export async function appendOrderEvent(
  restaurantId: string,
  branchId: string,
  orderId: string,
  status: Parameters<typeof memory.appendOrderEvent>[3],
  note?: string,
) {
  return isPostgresBackend()
    ? postgres.appendOrderEvent(restaurantId, branchId, orderId, status, note)
    : memory.appendOrderEvent(restaurantId, branchId, orderId, status, note);
}

export async function updateOrder(
  restaurantId: string,
  branchId: string,
  orderId: string,
  patch: Parameters<typeof memory.updateOrder>[3],
  eventNote?: string,
) {
  return isPostgresBackend()
    ? postgres.updateOrder(restaurantId, branchId, orderId, patch, eventNote)
    : memory.updateOrder(restaurantId, branchId, orderId, patch, eventNote);
}

export async function replaceOrderItems(
  restaurantId: string,
  branchId: string,
  orderId: string,
  items: Parameters<typeof memory.replaceOrderItems>[3],
  eventNote?: string,
) {
  return isPostgresBackend()
    ? postgres.replaceOrderItems(restaurantId, branchId, orderId, items, eventNote)
    : memory.replaceOrderItems(restaurantId, branchId, orderId, items, eventNote);
}

export async function updateOrderDetails(
  restaurantId: string,
  branchId: string,
  orderId: string,
  patch: Parameters<typeof memory.updateOrderDetails>[3],
  eventNote?: string,
) {
  return isPostgresBackend()
    ? postgres.updateOrderDetails(restaurantId, branchId, orderId, patch, eventNote)
    : memory.updateOrderDetails(restaurantId, branchId, orderId, patch, eventNote);
}

export async function cancelOrder(
  restaurantId: string,
  branchId: string,
  orderId: string,
  eventNote?: string,
) {
  return isPostgresBackend()
    ? postgres.cancelOrder(restaurantId, branchId, orderId, eventNote)
    : memory.cancelOrder(restaurantId, branchId, orderId, eventNote);
}

export async function findEditableOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  return isPostgresBackend()
    ? postgres.findEditableOrderByPhone(restaurantId, branchId, phone)
    : memory.findEditableOrderByPhone(restaurantId, branchId, phone);
}

export async function listOrders(
  restaurantId: string,
  branchId: string,
  filters?: Parameters<typeof memory.listOrders>[2],
) {
  return isPostgresBackend()
    ? postgres.listOrders(restaurantId, branchId, filters)
    : memory.listOrders(restaurantId, branchId, filters);
}

export async function getOrderById(
  restaurantId: string,
  branchId: string,
  orderId: string,
) {
  return isPostgresBackend()
    ? postgres.getOrderById(restaurantId, branchId, orderId)
    : memory.getOrderById(restaurantId, branchId, orderId);
}

export async function getOrderEvents(
  restaurantId: string,
  branchId: string,
  orderId: string,
) {
  return isPostgresBackend()
    ? postgres.getOrderEvents(restaurantId, branchId, orderId)
    : memory.getOrderEvents(restaurantId, branchId, orderId);
}

export async function acknowledgeKitchenOrder(
  restaurantId: string,
  branchId: string,
  orderId: string,
) {
  return isPostgresBackend()
    ? postgres.acknowledgeKitchenOrder(restaurantId, branchId, orderId)
    : memory.acknowledgeKitchenOrder(restaurantId, branchId, orderId);
}

export async function setConversationStep(
  restaurantId: string,
  branchId: string,
  phone: string,
  step: Parameters<typeof memory.setConversationStep>[3],
) {
  return isPostgresBackend()
    ? postgres.setConversationStep(restaurantId, branchId, phone, step)
    : memory.setConversationStep(restaurantId, branchId, phone, step);
}
