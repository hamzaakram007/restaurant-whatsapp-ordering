import { isDatabaseEnabled } from "@/lib/db";
import * as memory from "@/lib/store-memory";
import * as postgres from "@/lib/store-postgres";

function isPostgresBackend() {
  return isDatabaseEnabled();
}

export function getStorageMode() {
  return isPostgresBackend() ? "neon-postgres" : "in-memory-demo";
}

export async function ensureStoreReady() {
  if (isPostgresBackend()) {
    await postgres.ensureDemoDataIfNeeded();
  }
}

export function resetStoreForTests() {
  memory.resetStoreForTests();
}

export async function resetDemoData() {
  return isPostgresBackend() ? postgres.resetDemoData() : memory.resetDemoData();
}

export async function clearConversationForPhone(phone: string) {
  return isPostgresBackend()
    ? postgres.clearConversationForPhone(phone)
    : memory.clearConversationForPhone(phone);
}

export async function getDemoStats() {
  return isPostgresBackend() ? postgres.getDemoStats() : memory.getDemoStats();
}

export async function getCategories() {
  return isPostgresBackend() ? postgres.getCategories() : memory.getCategories();
}

export async function getMenuItems(categoryId?: string) {
  return isPostgresBackend() ? postgres.getMenuItems(categoryId) : memory.getMenuItems(categoryId);
}

export async function getAllMenuItems(categoryId?: string) {
  return isPostgresBackend() ? postgres.getAllMenuItems(categoryId) : memory.getAllMenuItems(categoryId);
}

export async function getMenuItemById(id: string) {
  return isPostgresBackend() ? postgres.getMenuItemById(id) : memory.getMenuItemById(id);
}

export async function upsertMenuItem(item: Parameters<typeof memory.upsertMenuItem>[0]) {
  return isPostgresBackend() ? postgres.upsertMenuItem(item) : memory.upsertMenuItem(item);
}

export async function getOrCreateCustomer(phone: string) {
  return isPostgresBackend() ? postgres.getOrCreateCustomer(phone) : memory.getOrCreateCustomer(phone);
}

export async function getOrCreateConversation(phone: string) {
  return isPostgresBackend()
    ? postgres.getOrCreateConversation(phone)
    : memory.getOrCreateConversation(phone);
}

export async function updateConversation(
  phone: string,
  patch: Parameters<typeof memory.updateConversation>[1],
) {
  return isPostgresBackend()
    ? postgres.updateConversation(phone, patch)
    : memory.updateConversation(phone, patch);
}

export async function getConversationContext(phone: string) {
  return isPostgresBackend()
    ? postgres.getConversationContext(phone)
    : memory.getConversationContext(phone);
}

export async function setConversationContext(
  phone: string,
  context: Parameters<typeof memory.setConversationContext>[1],
) {
  return isPostgresBackend()
    ? postgres.setConversationContext(phone, context)
    : memory.setConversationContext(phone, context);
}

export async function getCart(phone: string) {
  return isPostgresBackend() ? postgres.getCart(phone) : memory.getCart(phone);
}

export async function setCart(phone: string, items: Parameters<typeof memory.setCart>[1]) {
  return isPostgresBackend() ? postgres.setCart(phone, items) : memory.setCart(phone, items);
}

export async function addToCart(phone: string, line: Parameters<typeof memory.addToCart>[1]) {
  return isPostgresBackend() ? postgres.addToCart(phone, line) : memory.addToCart(phone, line);
}

export async function clearCart(phone: string) {
  return isPostgresBackend() ? postgres.clearCart(phone) : memory.clearCart(phone);
}

export async function findActiveOrderByPhone(phone: string) {
  return isPostgresBackend()
    ? postgres.findActiveOrderByPhone(phone)
    : memory.findActiveOrderByPhone(phone);
}

export async function findLatestOrderByPhone(phone: string) {
  return isPostgresBackend()
    ? postgres.findLatestOrderByPhone(phone)
    : memory.findLatestOrderByPhone(phone);
}

export async function createOrderFromCart(input: Parameters<typeof memory.createOrderFromCart>[0]) {
  return isPostgresBackend()
    ? postgres.createOrderFromCart(input)
    : memory.createOrderFromCart(input);
}

export async function appendOrderEvent(
  orderId: string,
  status: Parameters<typeof memory.appendOrderEvent>[1],
  note?: string,
) {
  return isPostgresBackend()
    ? postgres.appendOrderEvent(orderId, status, note)
    : memory.appendOrderEvent(orderId, status, note);
}

export async function updateOrder(
  orderId: string,
  patch: Parameters<typeof memory.updateOrder>[1],
  eventNote?: string,
) {
  return isPostgresBackend()
    ? postgres.updateOrder(orderId, patch, eventNote)
    : memory.updateOrder(orderId, patch, eventNote);
}

export async function listOrders(filters?: Parameters<typeof memory.listOrders>[0]) {
  return isPostgresBackend() ? postgres.listOrders(filters) : memory.listOrders(filters);
}

export async function getOrderById(orderId: string) {
  return isPostgresBackend() ? postgres.getOrderById(orderId) : memory.getOrderById(orderId);
}

export async function getOrderEvents(orderId: string) {
  return isPostgresBackend() ? postgres.getOrderEvents(orderId) : memory.getOrderEvents(orderId);
}

export async function acknowledgeKitchenOrder(orderId: string) {
  return isPostgresBackend()
    ? postgres.acknowledgeKitchenOrder(orderId)
    : memory.acknowledgeKitchenOrder(orderId);
}

export async function setConversationStep(
  phone: string,
  step: Parameters<typeof memory.setConversationStep>[1],
) {
  return isPostgresBackend()
    ? postgres.setConversationStep(phone, step)
    : memory.setConversationStep(phone, step);
}
