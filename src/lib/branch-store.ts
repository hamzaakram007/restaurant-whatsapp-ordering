import { randomUUID } from "crypto";
import { isDatabaseEnabled } from "@/lib/db";
import { DEFAULT_BRANCH_ID, DEFAULT_BRANCH_SLUG } from "@/lib/branch-constants";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant-constants";
import { getRestaurantById } from "@/lib/restaurant-store";
import type {
  Branch,
  BranchMenuOverride,
  MenuItem,
  Restaurant,
  RestaurantPaymentConfig,
} from "@/lib/types";

const now = () => new Date().toISOString();

function mapBranchRow(row: Record<string, unknown>): Branch {
  return {
    id: row.id as string,
    restaurantId: row.restaurant_id as string,
    slug: row.slug as string,
    name: row.name as string,
    city: row.city as string,
    address: row.address as string,
    deliveryFeeCents: (row.delivery_fee_cents as number | null) ?? undefined,
    payment: (row.payment as RestaurantPaymentConfig | null) ?? undefined,
    twilioWhatsappFrom: (row.twilio_whatsapp_from as string | null) ?? undefined,
    isDefault: row.is_default as boolean,
    active: row.active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

type MemoryBranchStore = {
  branches: Branch[];
  overrides: BranchMenuOverride[];
  branchOnlyItems: (MenuItem & { branchId: string })[];
  orderSeq: Record<string, number>;
  centralNumbers: Record<string, string>;
};

declare global {
  var restaurantBranchStore: MemoryBranchStore | undefined;
}

function getMemoryBranchStore(): MemoryBranchStore {
  if (!globalThis.restaurantBranchStore) {
    globalThis.restaurantBranchStore = {
      branches: [
        {
          id: DEFAULT_BRANCH_ID,
          restaurantId: DEFAULT_RESTAURANT_ID,
          slug: DEFAULT_BRANCH_SLUG,
          name: "Brew & Bite Main",
          city: "Lahore",
          address: "",
          twilioWhatsappFrom: "whatsapp:+14155238886",
          isDefault: true,
          active: true,
          createdAt: now(),
          updatedAt: now(),
        },
      ],
      overrides: [],
      branchOnlyItems: [],
      orderSeq: { [DEFAULT_BRANCH_ID]: 1006 },
      centralNumbers: {},
    };
  }
  return globalThis.restaurantBranchStore;
}

export function resetBranchStoreForTests() {
  globalThis.restaurantBranchStore = undefined;
}

export async function getBranchById(id: string) {
  if (!isDatabaseEnabled()) {
    return getMemoryBranchStore().branches.find((b) => b.id === id);
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`select * from branches where id = ${id} limit 1`;
  return rows[0] ? mapBranchRow(rows[0] as Record<string, unknown>) : undefined;
}

export async function getBranchBySlug(restaurantId: string, slug: string) {
  if (!isDatabaseEnabled()) {
    return getMemoryBranchStore().branches.find(
      (b) => b.restaurantId === restaurantId && b.slug === slug,
    );
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    select * from branches where restaurant_id = ${restaurantId} and slug = ${slug} limit 1
  `;
  return rows[0] ? mapBranchRow(rows[0] as Record<string, unknown>) : undefined;
}

export async function getDefaultBranch(restaurantId: string) {
  if (!isDatabaseEnabled()) {
    return (
      getMemoryBranchStore().branches.find(
        (b) => b.restaurantId === restaurantId && b.isDefault,
      ) ??
      getMemoryBranchStore().branches.find((b) => b.restaurantId === restaurantId)
    );
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    select * from branches
    where restaurant_id = ${restaurantId} and is_default = true
    limit 1
  `;
  if (rows[0]) return mapBranchRow(rows[0] as Record<string, unknown>);
  const fallback = await sql`
    select * from branches where restaurant_id = ${restaurantId} order by created_at asc limit 1
  `;
  return fallback[0] ? mapBranchRow(fallback[0] as Record<string, unknown>) : undefined;
}

export async function listBranches(restaurantId: string) {
  if (!isDatabaseEnabled()) {
    return getMemoryBranchStore().branches.filter(
      (b) => b.restaurantId === restaurantId && b.active,
    );
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    select * from branches where restaurant_id = ${restaurantId} and active = true
    order by is_default desc, name asc
  `;
  return rows.map((row) => mapBranchRow(row as Record<string, unknown>));
}

export async function getBranchByTwilioTo(to: string) {
  const normalized = to.trim().toLowerCase();
  if (!isDatabaseEnabled()) {
    return getMemoryBranchStore().branches.find(
      (b) => b.twilioWhatsappFrom?.toLowerCase() === normalized,
    );
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    select * from branches where lower(twilio_whatsapp_from) = ${normalized} limit 1
  `;
  return rows[0] ? mapBranchRow(rows[0] as Record<string, unknown>) : undefined;
}

export async function getRestaurantByCentralTwilioTo(to: string): Promise<Restaurant | undefined> {
  const normalized = to.trim().toLowerCase();
  if (!isDatabaseEnabled()) {
    const store = getMemoryBranchStore();
    const restaurantId = Object.entries(store.centralNumbers).find(
      ([, number]) => number.toLowerCase() === normalized,
    )?.[0];
    return restaurantId ? getRestaurantById(restaurantId) : undefined;
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    select id from restaurants where lower(central_twilio_whatsapp_from) = ${normalized} limit 1
  `;
  if (!rows[0]) return undefined;
  return getRestaurantById(rows[0].id as string);
}

export async function setCentralTwilioNumber(restaurantId: string, number: string | undefined) {
  if (!isDatabaseEnabled()) {
    const store = getMemoryBranchStore();
    if (number) store.centralNumbers[restaurantId] = number;
    else delete store.centralNumbers[restaurantId];
    return;
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  await sql`
    update restaurants set central_twilio_whatsapp_from = ${number ?? null}, updated_at = ${now()}
    where id = ${restaurantId}
  `;
}

export async function createBranch(input: {
  restaurantId: string;
  slug: string;
  name: string;
  city?: string;
  address?: string;
  twilioWhatsappFrom?: string;
  isDefault?: boolean;
}) {
  if (!isDatabaseEnabled()) {
    const store = getMemoryBranchStore();
    if (store.branches.some((b) => b.restaurantId === input.restaurantId && b.slug === input.slug)) {
      throw new Error("Branch slug already exists");
    }
    const branch: Branch = {
      id: randomUUID(),
      restaurantId: input.restaurantId,
      slug: input.slug,
      name: input.name,
      city: input.city ?? "",
      address: input.address ?? "",
      twilioWhatsappFrom: input.twilioWhatsappFrom,
      isDefault: input.isDefault ?? false,
      active: true,
      createdAt: now(),
      updatedAt: now(),
    };
    store.branches.push(branch);
    store.orderSeq[branch.id] = 1001;
    return branch;
  }

  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const id = randomUUID();
  const createdAt = now();
  await sql`
    insert into branches (
      id, restaurant_id, slug, name, city, address, twilio_whatsapp_from, is_default, active, created_at, updated_at
    ) values (
      ${id}, ${input.restaurantId}, ${input.slug}, ${input.name},
      ${input.city ?? ""}, ${input.address ?? ""}, ${input.twilioWhatsappFrom ?? null},
      ${input.isDefault ?? false}, true, ${createdAt}, ${createdAt}
    )
  `;
  await sql`
    insert into branch_order_number_seq (branch_id, next_order_number) values (${id}, 1001)
    on conflict (branch_id) do nothing
  `;
  return (await getBranchById(id))!;
}

export async function ensureDefaultBranch(restaurantId: string) {
  const existing = await getDefaultBranch(restaurantId);
  if (existing) return existing;
  const restaurant = await getRestaurantById(restaurantId);
  return createBranch({
    restaurantId,
    slug: DEFAULT_BRANCH_SLUG,
    name: `${restaurant?.name ?? "Restaurant"} Main`,
    twilioWhatsappFrom: restaurant?.twilioWhatsappFrom,
    isDefault: true,
  });
}

export async function updateBranch(
  id: string,
  patch: Partial<
    Pick<
      Branch,
      | "name"
      | "city"
      | "address"
      | "deliveryFeeCents"
      | "payment"
      | "twilioWhatsappFrom"
      | "active"
    >
  >,
) {
  const existing = await getBranchById(id);
  if (!existing) throw new Error("Branch not found");

  if (!isDatabaseEnabled()) {
    const store = getMemoryBranchStore();
    const index = store.branches.findIndex((b) => b.id === id);
    store.branches[index] = { ...existing, ...patch, updatedAt: now() };
    return store.branches[index]!;
  }

  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  await sql`
    update branches set
      name = ${patch.name ?? existing.name},
      city = ${patch.city ?? existing.city},
      address = ${patch.address ?? existing.address},
      delivery_fee_cents = ${patch.deliveryFeeCents ?? existing.deliveryFeeCents ?? null},
      payment = ${patch.payment ? JSON.stringify(patch.payment) : existing.payment ? JSON.stringify(existing.payment) : null}::jsonb,
      twilio_whatsapp_from = ${patch.twilioWhatsappFrom ?? existing.twilioWhatsappFrom ?? null},
      active = ${patch.active ?? existing.active},
      updated_at = ${now()}
    where id = ${id}
  `;
  return (await getBranchById(id))!;
}

export async function getBranchOverrides(branchId: string) {
  if (!isDatabaseEnabled()) {
    return getMemoryBranchStore().overrides.filter((o) => o.branchId === branchId);
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`select * from branch_menu_overrides where branch_id = ${branchId}`;
  return rows.map(
    (row) =>
      ({
        branchId: row.branch_id as string,
        menuItemId: row.menu_item_id as string,
        available: row.available as boolean | undefined,
        priceCents: row.price_cents as number | undefined,
        name: row.name as string | undefined,
        description: row.description as string | undefined,
      }) satisfies BranchMenuOverride,
  );
}

export async function upsertBranchOverride(override: BranchMenuOverride) {
  if (!isDatabaseEnabled()) {
    const store = getMemoryBranchStore();
    const index = store.overrides.findIndex(
      (o) => o.branchId === override.branchId && o.menuItemId === override.menuItemId,
    );
    if (index >= 0) store.overrides[index] = override;
    else store.overrides.push(override);
    return override;
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  await sql`
    insert into branch_menu_overrides (branch_id, menu_item_id, available, price_cents, name, description)
    values (
      ${override.branchId}, ${override.menuItemId},
      ${override.available ?? null}, ${override.priceCents ?? null},
      ${override.name ?? null}, ${override.description ?? null}
    )
    on conflict (branch_id, menu_item_id) do update set
      available = excluded.available,
      price_cents = excluded.price_cents,
      name = excluded.name,
      description = excluded.description
  `;
  return override;
}

export async function getBranchOnlyItems(branchId: string) {
  if (!isDatabaseEnabled()) {
    return getMemoryBranchStore()
      .branchOnlyItems.filter((i) => i.branchId === branchId)
      .map((entry) => {
        const { branchId: branchScope, ...item } = entry;
        void branchScope;
        return item;
      });
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`select * from branch_menu_items where branch_id = ${branchId}`;
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
        optionGroups: row.option_groups as MenuItem["optionGroups"],
        imageUrl: (row.image_url as string | null) ?? undefined,
      }) satisfies MenuItem,
  );
}

export async function upsertBranchOnlyItem(branchId: string, item: MenuItem) {
  if (!isDatabaseEnabled()) {
    const store = getMemoryBranchStore();
    const index = store.branchOnlyItems.findIndex(
      (i) => i.branchId === branchId && i.id === item.id,
    );
    const entry = { ...item, branchId };
    if (index >= 0) store.branchOnlyItems[index] = entry;
    else store.branchOnlyItems.push(entry);
    return item;
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  await sql`
    insert into branch_menu_items (
      branch_id, id, category_id, name, description, price_cents, available, prep_minutes, option_groups, image_url, updated_at
    ) values (
      ${branchId}, ${item.id}, ${item.categoryId}, ${item.name}, ${item.description},
      ${item.priceCents}, ${item.available}, ${item.prepMinutes},
      ${JSON.stringify(item.optionGroups)}::jsonb, ${item.imageUrl ?? null}, ${now()}
    )
    on conflict (branch_id, id) do update set
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

export async function getNextBranchOrderNumber(branchId: string) {
  if (!isDatabaseEnabled()) {
    const store = getMemoryBranchStore();
    const current = store.orderSeq[branchId] ?? 1001;
    store.orderSeq[branchId] = current + 1;
    return current;
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    update branch_order_number_seq
    set next_order_number = next_order_number + 1
    where branch_id = ${branchId}
    returning next_order_number - 1 as order_number
  `;
  if (rows[0]) return rows[0].order_number as number;
  await sql`
    insert into branch_order_number_seq (branch_id, next_order_number) values (${branchId}, 1002)
    on conflict (branch_id) do nothing
  `;
  return 1001;
}
