import { randomUUID } from "crypto";
import {
  demoCustomers,
  demoOrderEvents,
  demoOrders,
} from "@/data/demo-seed";
import { seedCategories, seedMenuItems } from "@/data/seed-menu";
import { getSql } from "@/lib/db";
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
  notes: string | null;
};

function mapItem(row: ItemRow): CartLine {
  return {
    menuItemId: row.menu_item_id,
    name: row.name,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
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
    select menu_item_id, name, quantity, unit_price_cents, notes
    from order_items
    where order_id = ${orderId}
  `;
  return rows.map((row) => mapItem(row as ItemRow));
}

async function loadOrder(row: OrderRow) {
  const items = await loadOrderItems(row.id);
  return mapOrder(row, items);
}

async function ensureMenuSeeded() {
  const sql = getSql();
  const rows = await sql`select count(*)::int as count from menu_categories`;
  if ((rows[0]?.count as number) > 0) return;

  for (const category of seedCategories) {
    await sql`
      insert into menu_categories (id, name, sort_order)
      values (${category.id}, ${category.name}, ${category.sortOrder})
      on conflict (id) do nothing
    `;
  }

  for (const item of seedMenuItems) {
    await sql`
      insert into menu_items (
        id, category_id, name, description, price_cents, available, prep_minutes, modifiers, updated_at
      ) values (
        ${item.id},
        ${item.categoryId},
        ${item.name},
        ${item.description},
        ${item.priceCents},
        ${item.available},
        ${item.prepMinutes},
        ${item.modifiers},
        ${now()}
      )
      on conflict (id) do nothing
    `;
  }
}

async function nextOrderNumber() {
  const sql = getSql();
  const rows = await sql`
    update order_number_seq
    set next_order_number = next_order_number + 1
    where id = 1
    returning next_order_number - 1 as order_number
  `;
  return rows[0]?.order_number as number;
}

export async function resetDemoData() {
  const sql = getSql();
  await sql`delete from order_events`;
  await sql`delete from order_items`;
  await sql`delete from orders`;
  await sql`delete from customers where id like 'demo-%'`;
  await sql`update order_number_seq set next_order_number = 1006 where id = 1`;

  for (const customer of demoCustomers) {
    await sql`
      insert into customers (id, phone, name, default_address, created_at)
      values (${customer.id}, ${customer.phone}, ${customer.name ?? null}, ${customer.defaultAddress ?? null}, ${customer.createdAt})
      on conflict (id) do nothing
    `;
  }

  for (const order of demoOrders) {
    await sql`
      insert into orders (
        id, order_number, customer_phone, customer_name, status, payment_status,
        fulfillment_type, delivery_address, pickup_time, subtotal_cents, delivery_fee_cents,
        total_cents, payment_screenshot_url, payment_verified_by, payment_verified_at,
        payment_rejection_reason, kitchen_acknowledged_at, created_at, updated_at
      ) values (
        ${order.id},
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
        insert into order_items (order_id, menu_item_id, name, quantity, unit_price_cents, notes)
        values (${order.id}, ${item.menuItemId}, ${item.name}, ${item.quantity}, ${item.unitPriceCents}, ${item.notes ?? null})
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

export async function clearConversationForPhone(phone: string) {
  const sql = getSql();
  await sql`delete from conversations where customer_phone = ${phone}`;
  await sql`delete from carts where customer_phone = ${phone}`;
}

export async function getDemoStats() {
  const sql = getSql();
  const rows = await sql`
    select
      count(*)::int as order_count,
      count(*) filter (where status = 'payment_uploaded')::int as pending_payments,
      count(*) filter (where status in ('confirmed','in_kitchen','ready','out_for_delivery'))::int as active_orders,
      count(*) filter (where status = 'completed')::int as completed_today
    from orders
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

export async function getCategories() {
  await ensureMenuSeeded();
  const sql = getSql();
  const rows = await sql`select id, name, sort_order from menu_categories order by sort_order asc`;
  return rows.map(
    (row) =>
      ({
        id: row.id as string,
        name: row.name as string,
        sortOrder: row.sort_order as number,
      }) satisfies MenuCategory,
  );
}

export async function getMenuItems(categoryId?: string) {
  await ensureMenuSeeded();
  const sql = getSql();
  const rows = categoryId
    ? await sql`
        select id, category_id, name, description, price_cents, available, prep_minutes, modifiers, image_url
        from menu_items
        where available = true and category_id = ${categoryId}
        order by name asc
      `
    : await sql`
        select id, category_id, name, description, price_cents, available, prep_minutes, modifiers, image_url
        from menu_items
        where available = true
        order by name asc
      `;

  return rows.map(
    (row) =>
      ({
        id: row.id as string,
        categoryId: row.category_id as string,
        name: row.name as string,
        description: row.description as string,
        priceCents: row.price_cents as number,
        available: row.available as boolean,
        prepMinutes: row.prep_minutes as number,
        modifiers: row.modifiers as string[],
        imageUrl: (row.image_url as string | null) ?? undefined,
      }) satisfies MenuItem,
  );
}

export async function getMenuItemById(id: string) {
  const items = await getMenuItems();
  return items.find((item) => item.id === id);
}

export async function upsertMenuItem(item: MenuItem) {
  const sql = getSql();
  await sql`
    insert into menu_items (
      id, category_id, name, description, price_cents, available, prep_minutes, modifiers, image_url, updated_at
    ) values (
      ${item.id},
      ${item.categoryId},
      ${item.name},
      ${item.description},
      ${item.priceCents},
      ${item.available},
      ${item.prepMinutes},
      ${item.modifiers},
      ${item.imageUrl ?? null},
      ${now()}
    )
    on conflict (id) do update set
      category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      price_cents = excluded.price_cents,
      available = excluded.available,
      prep_minutes = excluded.prep_minutes,
      modifiers = excluded.modifiers,
      image_url = excluded.image_url,
      updated_at = excluded.updated_at
  `;
  return item;
}

export async function getOrCreateCustomer(phone: string): Promise<Customer> {
  const sql = getSql();
  const existing = await sql`select id, phone, name, default_address, created_at from customers where phone = ${phone} limit 1`;
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
    insert into customers (id, phone, created_at)
    values (${id}, ${phone}, ${createdAt})
  `;
  return { id, phone, createdAt };
}

export async function getOrCreateConversation(phone: string): Promise<Conversation> {
  const sql = getSql();
  const existing = await sql`
    select id, customer_phone, step, active_category_id, shown_item_ids, created_at, updated_at
    from conversations
    where customer_phone = ${phone}
    limit 1
  `;

  if (existing[0]) {
    const row = existing[0];
    return {
      id: row.id as string,
      customerPhone: row.customer_phone as string,
      step: row.step as ConversationStep,
      activeCategoryId: (row.active_category_id as string | null) ?? undefined,
      shownItemIds: (row.shown_item_ids as string[]) ?? [],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  const rows = await sql`
    insert into conversations (customer_phone, step, shown_item_ids, created_at, updated_at)
    values (${phone}, 'idle', ${[]}, ${now()}, ${now()})
    returning id, customer_phone, step, active_category_id, shown_item_ids, created_at, updated_at
  `;
  const row = rows[0];
  return {
    id: row.id as string,
    customerPhone: row.customer_phone as string,
    step: row.step as ConversationStep,
    activeCategoryId: (row.active_category_id as string | null) ?? undefined,
    shownItemIds: (row.shown_item_ids as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function updateConversation(
  phone: string,
  patch: Partial<Pick<Conversation, "step" | "activeCategoryId" | "shownItemIds">>,
) {
  const conversation = await getOrCreateConversation(phone);
  const sql = getSql();
  const rows = await sql`
    update conversations
    set
      step = ${patch.step ?? conversation.step},
      active_category_id = ${patch.activeCategoryId ?? conversation.activeCategoryId ?? null},
      shown_item_ids = ${patch.shownItemIds ?? conversation.shownItemIds},
      updated_at = ${now()}
    where customer_phone = ${phone}
    returning id, customer_phone, step, active_category_id, shown_item_ids, created_at, updated_at
  `;
  const row = rows[0];
  return {
    id: row.id as string,
    customerPhone: row.customer_phone as string,
    step: row.step as ConversationStep,
    activeCategoryId: (row.active_category_id as string | null) ?? undefined,
    shownItemIds: (row.shown_item_ids as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getCart(phone: string): Promise<CartLine[]> {
  const sql = getSql();
  const rows = await sql`select lines from carts where customer_phone = ${phone} limit 1`;
  if (!rows[0]) return [];
  return (rows[0].lines as CartLine[]) ?? [];
}

export async function setCart(phone: string, items: CartLine[]) {
  const sql = getSql();
  await sql`
    insert into carts (customer_phone, lines, updated_at)
    values (${phone}, ${JSON.stringify(items)}::jsonb, ${now()})
    on conflict (customer_phone) do update
      set lines = excluded.lines, updated_at = excluded.updated_at
  `;
  return items;
}

export async function addToCart(phone: string, line: CartLine) {
  const cart = await getCart(phone);
  const existing = cart.find((item) => item.menuItemId === line.menuItemId);
  if (existing) {
    existing.quantity += line.quantity;
    if (line.notes) existing.notes = line.notes;
  } else {
    cart.push(line);
  }
  return setCart(phone, cart);
}

export async function clearCart(phone: string) {
  const sql = getSql();
  await sql`delete from carts where customer_phone = ${phone}`;
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

export async function findActiveOrderByPhone(phone: string) {
  const sql = getSql();
  const rows = await sql`
    select *
    from orders
    where customer_phone = ${phone} and status = any(${activeStatuses})
    order by created_at desc
    limit 1
  `;
  if (!rows[0]) return undefined;
  return loadOrder(rows[0] as OrderRow);
}

export async function findLatestOrderByPhone(phone: string) {
  const sql = getSql();
  const rows = await sql`
    select * from orders
    where customer_phone = ${phone}
    order by created_at desc
    limit 1
  `;
  if (!rows[0]) return undefined;
  return loadOrder(rows[0] as OrderRow);
}

export async function createOrderFromCart(input: {
  phone: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  pickupTime?: string;
  deliveryFeeCents: number;
}) {
  const cart = await getCart(input.phone);
  if (cart.length === 0) throw new Error("Cart is empty");

  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const deliveryFeeCents =
    input.fulfillmentType === "delivery" ? input.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;
  const orderNumber = await nextOrderNumber();
  const orderId = randomUUID();
  const createdAt = now();
  const sql = getSql();

  await sql`
    insert into orders (
      id, order_number, customer_phone, status, payment_status, fulfillment_type,
      delivery_address, pickup_time, subtotal_cents, delivery_fee_cents, total_cents,
      created_at, updated_at
    ) values (
      ${orderId},
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
      insert into order_items (order_id, menu_item_id, name, quantity, unit_price_cents, notes)
      values (${orderId}, ${item.menuItemId}, ${item.name}, ${item.quantity}, ${item.unitPriceCents}, ${item.notes ?? null})
    `;
  }

  await appendOrderEvent(orderId, "awaiting_payment", "Order created, awaiting payment");
  await clearCart(input.phone);

  const rows = await sql`select * from orders where id = ${orderId} limit 1`;
  return loadOrder(rows[0] as OrderRow);
}

export async function appendOrderEvent(orderId: string, status: OrderStatus, note?: string) {
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
    values (${event.id}, ${event.orderId}, ${event.status}, ${event.note ?? null}, ${event.createdAt})
  `;
  return event;
}

export async function updateOrder(
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
  const existing = await getOrderById(orderId);
  if (!existing) throw new Error("Order not found");

  const sql = getSql();
  await sql`
    update orders
    set
      status = ${patch.status ?? existing.status},
      payment_status = ${patch.paymentStatus ?? existing.paymentStatus},
      payment_screenshot_url = ${patch.paymentScreenshotUrl ?? existing.paymentScreenshotUrl ?? null},
      payment_verified_by = ${patch.paymentVerifiedBy ?? existing.paymentVerifiedBy ?? null},
      payment_verified_at = ${patch.paymentVerifiedAt ?? existing.paymentVerifiedAt ?? null},
      payment_rejection_reason = ${patch.paymentRejectionReason ?? existing.paymentRejectionReason ?? null},
      kitchen_acknowledged_at = ${patch.kitchenAcknowledgedAt ?? existing.kitchenAcknowledgedAt ?? null},
      delivery_address = ${patch.deliveryAddress ?? existing.deliveryAddress ?? null},
      pickup_time = ${patch.pickupTime ?? existing.pickupTime ?? null},
      updated_at = ${now()}
    where id = ${orderId}
  `;

  if (patch.status) {
    await appendOrderEvent(orderId, patch.status, eventNote);
  }

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error("Order not found after update");
  return updated;
}

export async function listOrders(filters?: {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  limit?: number;
}) {
  const sql = getSql();
  const limit = filters?.limit ?? 100;
  let rows;

  if (filters?.status?.length) {
    rows = await sql`
      select * from orders
      where status = any(${filters.status})
      order by created_at desc
      limit ${limit}
    `;
  } else {
    rows = await sql`
      select * from orders
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

export async function getOrderById(orderId: string) {
  const sql = getSql();
  const rows = await sql`select * from orders where id = ${orderId} limit 1`;
  if (!rows[0]) return undefined;
  return loadOrder(rows[0] as OrderRow);
}

export async function getOrderEvents(orderId: string) {
  const sql = getSql();
  const rows = await sql`
    select id, order_id, status, note, created_at
    from order_events
    where order_id = ${orderId}
    order by created_at desc
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

export async function acknowledgeKitchenOrder(orderId: string) {
  return updateOrder(
    orderId,
    {
      kitchenAcknowledgedAt: now(),
      status: "in_kitchen",
    },
    "Kitchen acknowledged order",
  );
}

export async function setConversationStep(phone: string, step: ConversationStep) {
  return updateConversation(phone, { step });
}

export async function ensureDemoDataIfNeeded() {
  if (process.env.SEED_DEMO_DATA === "false") return;
  const stats = await getDemoStats();
  if (stats.orderCount === 0) {
    await resetDemoData();
  }
}
