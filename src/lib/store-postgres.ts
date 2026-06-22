import { randomUUID } from "crypto";
import {
  demoCustomers,
  demoOrderEvents,
  demoOrders,
} from "@/data/demo-seed";
import { seedCategories, seedMenuItems } from "@/data/seed-menu";
import { DEFAULT_BRANCH_ID } from "@/lib/branch-constants";
import {
  getEffectiveMenuItemById,
  getEffectiveMenuItems,
} from "@/lib/branch-menu";
import { getNextBranchOrderNumber } from "@/lib/branch-store";
import { getSql } from "@/lib/db";
import { getRestaurantById } from "@/lib/restaurant-store";
import {
  isOrderEditable,
  recalculateOrderTotals,
  shouldResetPaymentAfterEdit,
} from "@/lib/order-edit";
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
  MenuOptionGroup,
  Order,
  OrderEvent,
  OrderStatus,
  PaymentStatus,
  SelectedOption,
} from "@/lib/types";

const now = () => new Date().toISOString();

type OrderRow = {
  id: string;
  order_number: number;
  customer_phone: string;
  customer_name: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_type: FulfillmentType;
  delivery_address: string | null;
  pickup_time: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  notes: string | null;
  payment_screenshot_url: string | null;
  payment_verified_by: string | null;
  payment_verified_at: string | null;
  payment_rejection_reason: string | null;
  kitchen_acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  selected_options: SelectedOption[] | null;
  notes: string | null;
};

function mapMenuItemRow(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    name: row.name as string,
    description: row.description as string,
    priceCents: row.price_cents as number,
    available: row.available as boolean,
    prepMinutes: row.prep_minutes as number,
    optionGroups: (row.option_groups as MenuOptionGroup[]) ?? [],
    imageUrl: (row.image_url as string | null) ?? undefined,
  };
}

function mapConversationRow(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    customerPhone: row.customer_phone as string,
    step: row.step as ConversationStep,
    activeCategoryId: (row.active_category_id as string | null) ?? undefined,
    shownItemIds: (row.shown_item_ids as string[]) ?? [],
    context: (row.context as ConversationContext) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapItem(row: ItemRow): CartLine {
  const selectedOptions = row.selected_options ?? [];
  return {
    menuItemId: row.menu_item_id,
    name: row.name,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    lineKey:
      selectedOptions.length > 0
        ? `${row.menu_item_id}:${[...selectedOptions.map((option) => option.choiceId)].sort().join(":")}`
        : row.menu_item_id,
    selectedOptions,
    notes: row.notes ?? undefined,
  };
}

function mapOrder(row: OrderRow, items: CartLine[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerPhone: row.customer_phone,
    customerName: row.customer_name ?? undefined,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentType: row.fulfillment_type,
    deliveryAddress: row.delivery_address ?? undefined,
    pickupTime: row.pickup_time ?? undefined,
    items,
    subtotalCents: row.subtotal_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    totalCents: row.total_cents,
    notes: row.notes ?? undefined,
    paymentScreenshotUrl: row.payment_screenshot_url ?? undefined,
    paymentVerifiedBy: row.payment_verified_by ?? undefined,
    paymentVerifiedAt: row.payment_verified_at ?? undefined,
    paymentRejectionReason: row.payment_rejection_reason ?? undefined,
    kitchenAcknowledgedAt: row.kitchen_acknowledged_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadOrderItems(orderId: string) {
  const sql = getSql();
  const rows = await sql`
    select menu_item_id, name, quantity, unit_price_cents, selected_options, notes
    from order_items
    where order_id = ${orderId}
  `;
  return rows.map((row) =>
    mapItem({
      ...(row as ItemRow),
      selected_options: (row.selected_options as SelectedOption[] | null) ?? [],
    }),
  );
}

async function loadOrder(row: OrderRow) {
  const items = await loadOrderItems(row.id);
  return mapOrder(row, items);
}

async function ensureMenuSeeded(restaurantId: string) {
  const sql = getSql();
  const rows = await sql`
    select count(*)::int as count
    from menu_categories
    where restaurant_id = ${restaurantId}
  `;
  if ((rows[0]?.count as number) > 0) return;

  for (const category of seedCategories) {
    await sql`
      insert into menu_categories (restaurant_id, id, name, sort_order)
      values (${restaurantId}, ${category.id}, ${category.name}, ${category.sortOrder})
      on conflict (restaurant_id, id) do nothing
    `;
  }

  for (const item of seedMenuItems) {
    await sql`
      insert into menu_items (
        restaurant_id, id, category_id, name, description, price_cents, available, prep_minutes, option_groups, updated_at
      ) values (
        ${restaurantId},
        ${item.id},
        ${item.categoryId},
        ${item.name},
        ${item.description},
        ${item.priceCents},
        ${item.available},
        ${item.prepMinutes},
        ${JSON.stringify(item.optionGroups)}::jsonb,
        ${now()}
      )
      on conflict (restaurant_id, id) do nothing
    `;
  }
}

export async function resetDemoData(restaurantId: string, branchId: string) {
  const sql = getSql();

  await sql`
    delete from order_events
    where order_id in (
      select id from orders where restaurant_id = ${restaurantId} and branch_id = ${branchId}
    )
  `;
  await sql`
    delete from order_items
    where order_id in (
      select id from orders where restaurant_id = ${restaurantId} and branch_id = ${branchId}
    )
  `;
  await sql`
    delete from orders where restaurant_id = ${restaurantId} and branch_id = ${branchId}
  `;
  await sql`
    delete from customers
    where restaurant_id = ${restaurantId} and id like 'demo-%'
  `;
  await sql`
    update branch_order_number_seq
    set next_order_number = 1006
    where branch_id = ${branchId}
  `;

  for (const customer of demoCustomers) {
    await sql`
      insert into customers (id, restaurant_id, phone, name, default_address, created_at)
      values (
        ${customer.id},
        ${restaurantId},
        ${customer.phone},
        ${customer.name ?? null},
        ${customer.defaultAddress ?? null},
        ${customer.createdAt}
      )
      on conflict (id) do nothing
    `;
  }

  for (const order of demoOrders) {
    await sql`
      insert into orders (
        id, restaurant_id, branch_id, order_number, customer_phone, customer_name, status, payment_status,
        fulfillment_type, delivery_address, pickup_time, subtotal_cents, delivery_fee_cents,
        total_cents, payment_screenshot_url, payment_verified_by, payment_verified_at,
        payment_rejection_reason, kitchen_acknowledged_at, created_at, updated_at
      ) values (
        ${order.id},
        ${restaurantId},
        ${branchId},
        ${order.orderNumber},
        ${order.customerPhone},
        ${order.customerName ?? null},
        ${order.status},
        ${order.paymentStatus},
        ${order.fulfillmentType},
        ${order.deliveryAddress ?? null},
        ${order.pickupTime ?? null},
        ${order.subtotalCents},
        ${order.deliveryFeeCents},
        ${order.totalCents},
        ${order.paymentScreenshotUrl ?? null},
        ${order.paymentVerifiedBy ?? null},
        ${order.paymentVerifiedAt ?? null},
        ${order.paymentRejectionReason ?? null},
        ${order.kitchenAcknowledgedAt ?? null},
        ${order.createdAt},
        ${order.updatedAt}
      )
      on conflict (id) do nothing
    `;

    for (const item of order.items) {
      await sql`
        insert into order_items (order_id, menu_item_id, name, quantity, unit_price_cents, selected_options, notes)
        values (
          ${order.id},
          ${item.menuItemId},
          ${item.name},
          ${item.quantity},
          ${item.unitPriceCents},
          ${JSON.stringify(item.selectedOptions ?? [])}::jsonb,
          ${item.notes ?? null}
        )
      `;
    }
  }

  for (const event of demoOrderEvents) {
    await sql`
      insert into order_events (id, order_id, status, note, created_at)
      values (${event.id}, ${event.orderId}, ${event.status}, ${event.note ?? null}, ${event.createdAt})
      on conflict (id) do nothing
    `;
  }

  return {
    customers: demoCustomers.length,
    orders: demoOrders.length,
    orderEvents: demoOrderEvents.length,
  };
}

export async function clearConversationForPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  const sql = getSql();
  await sql`
    delete from conversations
    where restaurant_id = ${restaurantId} and branch_id = ${branchId} and customer_phone = ${phone}
  `;
  await sql`
    delete from carts
    where restaurant_id = ${restaurantId} and branch_id = ${branchId} and customer_phone = ${phone}
  `;
}

export async function getDemoStats(restaurantId: string, branchId?: string) {
  const sql = getSql();
  const rows = branchId
    ? await sql`
        select
          count(*)::int as order_count,
          count(*) filter (where status = 'payment_uploaded')::int as pending_payments,
          count(*) filter (where status in ('confirmed','in_kitchen','ready','out_for_delivery'))::int as active_orders,
          count(*) filter (where status = 'completed')::int as completed_today
        from orders
        where restaurant_id = ${restaurantId} and branch_id = ${branchId}
      `
    : await sql`
        select
          count(*)::int as order_count,
          count(*) filter (where status = 'payment_uploaded')::int as pending_payments,
          count(*) filter (where status in ('confirmed','in_kitchen','ready','out_for_delivery'))::int as active_orders,
          count(*) filter (where status = 'completed')::int as completed_today
        from orders
        where restaurant_id = ${restaurantId}
      `;
  const row = rows[0] as {
    order_count: number;
    pending_payments: number;
    active_orders: number;
    completed_today: number;
  };
  return {
    orderCount: row.order_count,
    pendingPayments: row.pending_payments,
    activeOrders: row.active_orders,
    completedToday: row.completed_today,
  };
}

export async function getCategories(restaurantId: string) {
  await ensureMenuSeeded(restaurantId);
  const sql = getSql();
  const rows = await sql`
    select id, name, sort_order
    from menu_categories
    where restaurant_id = ${restaurantId}
    order by sort_order asc
  `;
  return rows.map(
    (row) =>
      ({
        id: row.id as string,
        name: row.name as string,
        sortOrder: row.sort_order as number,
      }) satisfies MenuCategory,
  );
}

export async function getMenuItems(
  restaurantId: string,
  branchId: string,
  categoryId?: string,
) {
  await ensureMenuSeeded(restaurantId);
  return getEffectiveMenuItems(restaurantId, branchId, categoryId);
}

export async function getAllMenuItems(restaurantId: string, categoryId?: string) {
  await ensureMenuSeeded(restaurantId);
  const sql = getSql();
  const rows = categoryId
    ? await sql`
        select id, category_id, name, description, price_cents, available, prep_minutes, option_groups, image_url
        from menu_items
        where restaurant_id = ${restaurantId} and category_id = ${categoryId}
        order by name asc
      `
    : await sql`
        select id, category_id, name, description, price_cents, available, prep_minutes, option_groups, image_url
        from menu_items
        where restaurant_id = ${restaurantId}
        order by name asc
      `;

  return rows.map((row) => mapMenuItemRow(row as Record<string, unknown>));
}

export async function getMenuItemById(
  restaurantId: string,
  branchId: string,
  id: string,
) {
  await ensureMenuSeeded(restaurantId);
  return getEffectiveMenuItemById(restaurantId, branchId, id);
}

export async function getMenuItemByIdAdmin(restaurantId: string, id: string) {
  await ensureMenuSeeded(restaurantId);
  const sql = getSql();
  const rows = await sql`
    select id, category_id, name, description, price_cents, available, prep_minutes, option_groups, image_url
    from menu_items
    where restaurant_id = ${restaurantId} and id = ${id}
    limit 1
  `;
  if (!rows[0]) return undefined;
  return mapMenuItemRow(rows[0] as Record<string, unknown>);
}

export async function upsertMenuItem(restaurantId: string, item: MenuItem) {
  const sql = getSql();
  await sql`
    insert into menu_items (
      restaurant_id, id, category_id, name, description, price_cents, available, prep_minutes, option_groups, image_url, updated_at
    ) values (
      ${restaurantId},
      ${item.id},
      ${item.categoryId},
      ${item.name},
      ${item.description},
      ${item.priceCents},
      ${item.available},
      ${item.prepMinutes},
      ${JSON.stringify(item.optionGroups)}::jsonb,
      ${item.imageUrl ?? null},
      ${now()}
    )
    on conflict (restaurant_id, id) do update set
      category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      price_cents = excluded.price_cents,
      available = excluded.available,
      prep_minutes = excluded.prep_minutes,
      option_groups = excluded.option_groups,
      image_url = excluded.image_url,
      updated_at = excluded.updated_at
  `;
  return item;
}

export async function getOrCreateCustomer(
  restaurantId: string,
  phone: string,
): Promise<Customer> {
  const sql = getSql();
  const existing = await sql`
    select id, phone, name, default_address, created_at
    from customers
    where restaurant_id = ${restaurantId} and phone = ${phone}
    limit 1
  `;
  if (existing[0]) {
    const row = existing[0];
    return {
      id: row.id as string,
      phone: row.phone as string,
      name: (row.name as string | null) ?? undefined,
      defaultAddress: (row.default_address as string | null) ?? undefined,
      createdAt: row.created_at as string,
    };
  }

  const id = randomUUID();
  const createdAt = now();
  await sql`
    insert into customers (id, restaurant_id, phone, created_at)
    values (${id}, ${restaurantId}, ${phone}, ${createdAt})
  `;
  return { id, phone, createdAt };
}

export async function getOrCreateConversation(
  restaurantId: string,
  branchId: string,
  phone: string,
): Promise<Conversation> {
  const sql = getSql();
  const existing = await sql`
    select id, customer_phone, step, active_category_id, shown_item_ids, context, created_at, updated_at
    from conversations
    where restaurant_id = ${restaurantId} and branch_id = ${branchId} and customer_phone = ${phone}
    limit 1
  `;

  if (existing[0]) {
    return mapConversationRow(existing[0] as Record<string, unknown>);
  }

  const rows = await sql`
    insert into conversations (restaurant_id, branch_id, customer_phone, step, shown_item_ids, context, created_at, updated_at)
    values (${restaurantId}, ${branchId}, ${phone}, 'idle', ${[]}, ${JSON.stringify({})}::jsonb, ${now()}, ${now()})
    returning id, customer_phone, step, active_category_id, shown_item_ids, context, created_at, updated_at
  `;
  return mapConversationRow(rows[0] as Record<string, unknown>);
}

export async function updateConversation(
  restaurantId: string,
  branchId: string,
  phone: string,
  patch: Partial<
    Pick<Conversation, "step" | "activeCategoryId" | "shownItemIds" | "context">
  >,
) {
  const conversation = await getOrCreateConversation(restaurantId, branchId, phone);
  const sql = getSql();
  const nextContext = patch.context
    ? { ...conversation.context, ...patch.context }
    : conversation.context;
  const rows = await sql`
    update conversations
    set
      step = ${patch.step ?? conversation.step},
      active_category_id = ${patch.activeCategoryId ?? conversation.activeCategoryId ?? null},
      shown_item_ids = ${patch.shownItemIds ?? conversation.shownItemIds},
      context = ${JSON.stringify(nextContext)}::jsonb,
      updated_at = ${now()}
    where restaurant_id = ${restaurantId} and branch_id = ${branchId} and customer_phone = ${phone}
    returning id, customer_phone, step, active_category_id, shown_item_ids, context, created_at, updated_at
  `;
  return mapConversationRow(rows[0] as Record<string, unknown>);
}

export async function getConversationContext(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  return (await getOrCreateConversation(restaurantId, branchId, phone)).context;
}

export async function setConversationContext(
  restaurantId: string,
  branchId: string,
  phone: string,
  context: ConversationContext,
) {
  return updateConversation(restaurantId, branchId, phone, { context });
}

export async function getCart(
  restaurantId: string,
  branchId: string,
  phone: string,
): Promise<CartLine[]> {
  const sql = getSql();
  const rows = await sql`
    select lines
    from carts
    where restaurant_id = ${restaurantId} and branch_id = ${branchId} and customer_phone = ${phone}
    limit 1
  `;
  if (!rows[0]) return [];
  return (rows[0].lines as CartLine[]) ?? [];
}

export async function setCart(
  restaurantId: string,
  branchId: string,
  phone: string,
  items: CartLine[],
) {
  const sql = getSql();
  await sql`
    insert into carts (restaurant_id, branch_id, customer_phone, lines, updated_at)
    values (${restaurantId}, ${branchId}, ${phone}, ${JSON.stringify(items)}::jsonb, ${now()})
    on conflict (restaurant_id, branch_id, customer_phone) do update
      set lines = excluded.lines, updated_at = excluded.updated_at
  `;
  return items;
}

export async function addToCart(
  restaurantId: string,
  branchId: string,
  phone: string,
  line: CartLine,
) {
  const cart = await getCart(restaurantId, branchId, phone);
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
  return setCart(restaurantId, branchId, phone, cart);
}

export async function clearCart(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  const sql = getSql();
  await sql`
    delete from carts
    where restaurant_id = ${restaurantId} and branch_id = ${branchId} and customer_phone = ${phone}
  `;
}

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

export async function findActiveOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  const sql = getSql();
  const rows = await sql`
    select *
    from orders
    where restaurant_id = ${restaurantId}
      and branch_id = ${branchId}
      and customer_phone = ${phone}
      and status = any(${activeStatuses})
    order by created_at desc
    limit 1
  `;
  if (!rows[0]) return undefined;
  return loadOrder(rows[0] as OrderRow);
}

export async function findLatestOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  const sql = getSql();
  const rows = await sql`
    select * from orders
    where restaurant_id = ${restaurantId} and branch_id = ${branchId} and customer_phone = ${phone}
    order by created_at desc
    limit 1
  `;
  if (!rows[0]) return undefined;
  return loadOrder(rows[0] as OrderRow);
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
  const cart = await getCart(restaurantId, branchId, input.phone);
  if (cart.length === 0) throw new Error("Cart is empty");

  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const deliveryFeeCents =
    input.fulfillmentType === "delivery" ? input.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;
  const orderNumber = await getNextBranchOrderNumber(branchId);
  const orderId = randomUUID();
  const createdAt = now();
  const sql = getSql();

  await sql`
    insert into orders (
      id, restaurant_id, branch_id, order_number, customer_phone, status, payment_status, fulfillment_type,
      delivery_address, pickup_time, subtotal_cents, delivery_fee_cents, total_cents,
      created_at, updated_at
    ) values (
      ${orderId},
      ${restaurantId},
      ${branchId},
      ${orderNumber},
      ${input.phone},
      'awaiting_payment',
      'payment_requested',
      ${input.fulfillmentType},
      ${input.deliveryAddress ?? null},
      ${input.pickupTime ?? null},
      ${subtotalCents},
      ${deliveryFeeCents},
      ${totalCents},
      ${createdAt},
      ${createdAt}
    )
  `;

  for (const item of cart) {
    await sql`
      insert into order_items (order_id, menu_item_id, name, quantity, unit_price_cents, selected_options, notes)
      values (
        ${orderId},
        ${item.menuItemId},
        ${item.name},
        ${item.quantity},
        ${item.unitPriceCents},
        ${JSON.stringify(item.selectedOptions ?? [])}::jsonb,
        ${item.notes ?? null}
      )
    `;
  }

  await appendOrderEvent(
    restaurantId,
    branchId,
    orderId,
    "awaiting_payment",
    "Order created, awaiting payment",
  );
  await clearCart(restaurantId, branchId, input.phone);

  const rows = await sql`
    select * from orders
    where id = ${orderId} and restaurant_id = ${restaurantId} and branch_id = ${branchId}
    limit 1
  `;
  return loadOrder(rows[0] as OrderRow);
}

export async function appendOrderEvent(
  restaurantId: string,
  branchId: string,
  orderId: string,
  status: OrderStatus,
  note?: string,
) {
  const sql = getSql();
  const event: OrderEvent = {
    id: randomUUID(),
    orderId,
    status,
    note,
    createdAt: now(),
  };
  await sql`
    insert into order_events (id, order_id, status, note, created_at)
    select ${event.id}, ${event.orderId}, ${event.status}, ${event.note ?? null}, ${event.createdAt}
    from orders
    where id = ${orderId} and restaurant_id = ${restaurantId} and branch_id = ${branchId}
  `;
  return event;
}

export async function updateOrder(
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
      | "subtotalCents"
      | "deliveryFeeCents"
      | "totalCents"
    >
  >,
  eventNote?: string,
) {
  const existing = await getOrderById(restaurantId, branchId, orderId);
  if (!existing) throw new Error("Order not found");

  const paymentVerifiedBy =
    "paymentVerifiedBy" in patch
      ? (patch.paymentVerifiedBy ?? null)
      : (existing.paymentVerifiedBy ?? null);
  const paymentVerifiedAt =
    "paymentVerifiedAt" in patch
      ? (patch.paymentVerifiedAt ?? null)
      : (existing.paymentVerifiedAt ?? null);

  const sql = getSql();
  await sql`
    update orders
    set
      status = ${patch.status ?? existing.status},
      payment_status = ${patch.paymentStatus ?? existing.paymentStatus},
      payment_screenshot_url = ${patch.paymentScreenshotUrl ?? existing.paymentScreenshotUrl ?? null},
      payment_verified_by = ${paymentVerifiedBy},
      payment_verified_at = ${paymentVerifiedAt},
      payment_rejection_reason = ${patch.paymentRejectionReason ?? existing.paymentRejectionReason ?? null},
      kitchen_acknowledged_at = ${patch.kitchenAcknowledgedAt ?? existing.kitchenAcknowledgedAt ?? null},
      delivery_address = ${patch.deliveryAddress ?? existing.deliveryAddress ?? null},
      pickup_time = ${patch.pickupTime ?? existing.pickupTime ?? null},
      fulfillment_type = ${patch.fulfillmentType ?? existing.fulfillmentType},
      notes = ${patch.notes ?? existing.notes ?? null},
      subtotal_cents = ${patch.subtotalCents ?? existing.subtotalCents},
      delivery_fee_cents = ${patch.deliveryFeeCents ?? existing.deliveryFeeCents},
      total_cents = ${patch.totalCents ?? existing.totalCents},
      updated_at = ${now()}
    where id = ${orderId} and restaurant_id = ${restaurantId} and branch_id = ${branchId}
  `;

  if (patch.status) {
    await appendOrderEvent(restaurantId, branchId, orderId, patch.status, eventNote);
  } else if (eventNote) {
    await appendOrderEvent(restaurantId, branchId, orderId, patch.status ?? existing.status, eventNote);
  }

  const updated = await getOrderById(restaurantId, branchId, orderId);
  if (!updated) throw new Error("Order not found after update");
  return updated;
}

export async function replaceOrderItems(
  restaurantId: string,
  branchId: string,
  orderId: string,
  items: CartLine[],
  eventNote = "Order items updated",
) {
  const order = await getOrderById(restaurantId, branchId, orderId);
  if (!order) throw new Error("Order not found");
  if (!isOrderEditable(order)) throw new Error("Order is not editable");

  const restaurant = await getRestaurantById(restaurantId);
  const configuredFee = restaurant?.deliveryFeeCents ?? 15000;
  const deliveryFeeCents =
    order.fulfillmentType === "delivery" ? order.deliveryFeeCents || configuredFee : 0;
  const totals = recalculateOrderTotals(items, order.fulfillmentType, deliveryFeeCents);
  const resetPayment = shouldResetPaymentAfterEdit(order, totals.totalCents);
  const sql = getSql();

  await sql`delete from order_items where order_id = ${orderId}`;
  for (const item of items) {
    await sql`
      insert into order_items (order_id, menu_item_id, name, quantity, unit_price_cents, selected_options, notes)
      values (
        ${orderId},
        ${item.menuItemId},
        ${item.name},
        ${item.quantity},
        ${item.unitPriceCents},
        ${JSON.stringify(item.selectedOptions ?? [])}::jsonb,
        ${item.notes ?? null}
      )
    `;
  }

  const patch: Parameters<typeof updateOrder>[3] = { ...totals };
  if (resetPayment) {
    patch.paymentStatus = "payment_requested";
    patch.status = order.paymentScreenshotUrl ? "payment_uploaded" : "awaiting_payment";
    patch.paymentVerifiedBy = undefined;
    patch.paymentVerifiedAt = undefined;
  }

  return updateOrder(restaurantId, branchId, orderId, patch, eventNote);
}

export async function updateOrderDetails(
  restaurantId: string,
  branchId: string,
  orderId: string,
  patch: Partial<
    Pick<Order, "deliveryAddress" | "pickupTime" | "fulfillmentType" | "notes">
  >,
  eventNote = "Order details updated",
) {
  const order = await getOrderById(restaurantId, branchId, orderId);
  if (!order) throw new Error("Order not found");
  if (!isOrderEditable(order)) throw new Error("Order is not editable");

  const fulfillmentType = patch.fulfillmentType ?? order.fulfillmentType;
  const restaurant = await getRestaurantById(restaurantId);
  const configuredFee = restaurant?.deliveryFeeCents ?? 15000;
  const deliveryFeeCents =
    fulfillmentType === "delivery" ? order.deliveryFeeCents || configuredFee : 0;
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

export async function cancelOrder(
  restaurantId: string,
  branchId: string,
  orderId: string,
  eventNote = "Order cancelled",
) {
  const order = await getOrderById(restaurantId, branchId, orderId);
  if (!order) throw new Error("Order not found");
  if (!isOrderEditable(order)) throw new Error("Order is not editable");
  return updateOrder(restaurantId, branchId, orderId, { status: "cancelled" }, eventNote);
}

export async function findEditableOrderByPhone(
  restaurantId: string,
  branchId: string,
  phone: string,
) {
  const order =
    (await findActiveOrderByPhone(restaurantId, branchId, phone)) ??
    (await findLatestOrderByPhone(restaurantId, branchId, phone));
  if (!order || !isOrderEditable(order)) return undefined;
  return order;
}

export async function listOrders(
  restaurantId: string,
  branchId: string,
  filters?: {
    status?: OrderStatus[];
    paymentStatus?: PaymentStatus[];
    limit?: number;
  },
) {
  const sql = getSql();
  const limit = filters?.limit ?? 100;
  let rows;

  if (filters?.status?.length) {
    rows = await sql`
      select * from orders
      where restaurant_id = ${restaurantId} and branch_id = ${branchId} and status = any(${filters.status})
      order by created_at desc
      limit ${limit}
    `;
  } else {
    rows = await sql`
      select * from orders
      where restaurant_id = ${restaurantId} and branch_id = ${branchId}
      order by created_at desc
      limit ${limit}
    `;
  }

  let orders = await Promise.all(rows.map((row) => loadOrder(row as OrderRow)));

  if (filters?.paymentStatus?.length) {
    orders = orders.filter((order) =>
      filters.paymentStatus!.includes(order.paymentStatus),
    );
  }

  return orders;
}

export async function getOrderById(
  restaurantId: string,
  branchId: string,
  orderId: string,
) {
  const sql = getSql();
  const rows = await sql`
    select * from orders
    where id = ${orderId} and restaurant_id = ${restaurantId} and branch_id = ${branchId}
    limit 1
  `;
  if (!rows[0]) return undefined;
  return loadOrder(rows[0] as OrderRow);
}

export async function getOrderEvents(
  restaurantId: string,
  branchId: string,
  orderId: string,
) {
  const sql = getSql();
  const rows = await sql`
    select oe.id, oe.order_id, oe.status, oe.note, oe.created_at
    from order_events oe
    inner join orders o on o.id = oe.order_id
    where oe.order_id = ${orderId} and o.restaurant_id = ${restaurantId} and o.branch_id = ${branchId}
    order by oe.created_at desc
  `;
  return rows.map(
    (row) =>
      ({
        id: row.id as string,
        orderId: row.order_id as string,
        status: row.status as OrderStatus,
        note: (row.note as string | null) ?? undefined,
        createdAt: row.created_at as string,
      }) satisfies OrderEvent,
  );
}

export async function acknowledgeKitchenOrder(
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

export async function setConversationStep(
  restaurantId: string,
  branchId: string,
  phone: string,
  step: ConversationStep,
) {
  return updateConversation(restaurantId, branchId, phone, { step });
}

export async function ensureDemoDataIfNeeded(
  restaurantId = DEFAULT_RESTAURANT_ID,
  branchId = DEFAULT_BRANCH_ID,
) {
  if (process.env.SEED_DEMO_DATA === "false") return;
  const stats = await getDemoStats(restaurantId, branchId);
  if (stats.orderCount === 0) {
    await resetDemoData(restaurantId, branchId);
  }
}
