import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { ensureDefaultBranch } from "@/lib/branch-store";
import { isDatabaseEnabled } from "@/lib/db";
import { defaultRestaurantSeed } from "@/data/tenant-defaults";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant-constants";
import type {
  MemberRole,
  Restaurant,
  RestaurantMember,
  RestaurantPaymentConfig,
  RestaurantPlan,
  RestaurantStatus,
  RestaurantTrackingMessages,
  TwilioMode,
  User,
} from "@/lib/types";

const now = () => new Date().toISOString();

function mapRestaurantRow(row: Record<string, unknown>): Restaurant {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    tagline: row.tagline as string,
    currency: row.currency as string,
    deliveryFeeCents: row.delivery_fee_cents as number,
    payment: row.payment as RestaurantPaymentConfig,
    trackingMessages: row.tracking_messages as RestaurantTrackingMessages,
    status: row.status as RestaurantStatus,
    plan: row.plan as RestaurantPlan,
    twilioMode: row.twilio_mode as TwilioMode,
    twilioAccountSid: (row.twilio_account_sid as string | null) ?? undefined,
    twilioAuthTokenEncrypted:
      (row.twilio_auth_token_encrypted as string | null) ?? undefined,
    twilioWhatsappFrom: (row.twilio_whatsapp_from as string | null) ?? undefined,
    centralTwilioWhatsappFrom:
      (row.central_twilio_whatsapp_from as string | null) ?? undefined,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? undefined,
    stripeSubscriptionId:
      (row.stripe_subscription_id as string | null) ?? undefined,
    trialEndsAt: (row.trial_ends_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// --- In-memory restaurant store ---
type MemoryRestaurantStore = {
  restaurants: Restaurant[];
  users: User[];
  members: RestaurantMember[];
  passwordHashes: Record<string, string>;
};

declare global {
  var restaurantTenantStore: MemoryRestaurantStore | undefined;
}

function getMemoryRestaurantStore(): MemoryRestaurantStore {
  if (!globalThis.restaurantTenantStore) {
    const seed = defaultRestaurantSeed();
    const ownerId = randomUUID();
    globalThis.restaurantTenantStore = {
      restaurants: [
        {
          ...seed,
          createdAt: now(),
          updatedAt: now(),
        },
      ],
      users: [
        {
          id: ownerId,
          email: "owner@brew-bite.test",
          name: "Demo Owner",
          createdAt: now(),
        },
      ],
      members: [
        {
          restaurantId: DEFAULT_RESTAURANT_ID,
          userId: ownerId,
          role: "owner",
          createdAt: now(),
        },
      ],
      passwordHashes: {
        [ownerId]: hashPassword("password123"),
      },
    };
  }
  return globalThis.restaurantTenantStore;
}

export function resetRestaurantStoreForTests() {
  globalThis.restaurantTenantStore = undefined;
}

export function initMemoryStoresForTests() {
  getMemoryRestaurantStore();
}

function secretsKey() {
  const key = process.env.TENANT_SECRETS_KEY ?? process.env.AUTH_SECRET ?? "dev-only-secret";
  return createHash("sha256").update(key).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretsKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string) {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    secretsKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function restaurantToConfig(restaurant: Restaurant) {
  return {
    name: restaurant.name,
    tagline: restaurant.tagline,
    whatsappSender:
      restaurant.twilioWhatsappFrom ??
      process.env.TWILIO_WHATSAPP_FROM ??
      "whatsapp:+14155238886",
    currency: restaurant.currency,
    deliveryFeeCents: restaurant.deliveryFeeCents,
    payment: restaurant.payment,
    trackingMessages: restaurant.trackingMessages,
  };
}

export async function getRestaurantById(id: string) {
  if (!isDatabaseEnabled()) {
    return getMemoryRestaurantStore().restaurants.find((r) => r.id === id);
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`select * from restaurants where id = ${id} limit 1`;
  return rows[0] ? mapRestaurantRow(rows[0] as Record<string, unknown>) : undefined;
}

export async function getRestaurantBySlug(slug: string) {
  if (!isDatabaseEnabled()) {
    return getMemoryRestaurantStore().restaurants.find((r) => r.slug === slug);
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`select * from restaurants where slug = ${slug} limit 1`;
  return rows[0] ? mapRestaurantRow(rows[0] as Record<string, unknown>) : undefined;
}

export async function getRestaurantByTwilioTo(to: string) {
  const normalized = to.trim().toLowerCase();
  if (!isDatabaseEnabled()) {
    return getMemoryRestaurantStore().restaurants.find(
      (r) => r.twilioWhatsappFrom?.toLowerCase() === normalized,
    );
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    select * from restaurants
    where lower(twilio_whatsapp_from) = ${normalized}
    limit 1
  `;
  return rows[0] ? mapRestaurantRow(rows[0] as Record<string, unknown>) : undefined;
}

export async function listRestaurants() {
  if (!isDatabaseEnabled()) {
    return [...getMemoryRestaurantStore().restaurants];
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`select * from restaurants order by created_at desc`;
  return rows.map((row) => mapRestaurantRow(row as Record<string, unknown>));
}

export async function createRestaurant(input: {
  slug: string;
  name: string;
  tagline?: string;
  twilioWhatsappFrom?: string;
}) {
  const payment = defaultRestaurantSeed().payment;
  const trackingMessages = defaultRestaurantSeed().trackingMessages;
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  if (!isDatabaseEnabled()) {
    const store = getMemoryRestaurantStore();
    if (store.restaurants.some((r) => r.slug === input.slug)) {
      throw new Error("Restaurant slug already exists");
    }
    const restaurant: Restaurant = {
      id: randomUUID(),
      slug: input.slug,
      name: input.name,
      tagline: input.tagline ?? "",
      currency: "PKR",
      deliveryFeeCents: 15000,
      payment,
      trackingMessages,
      status: "trial",
      plan: "trial",
      twilioMode: "platform",
      twilioWhatsappFrom: input.twilioWhatsappFrom,
      trialEndsAt,
      createdAt: now(),
      updatedAt: now(),
    };
    store.restaurants.push(restaurant);
    await ensureDefaultBranch(restaurant.id);
    return restaurant;
  }

  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const id = randomUUID();
  const createdAt = now();
  await sql`
    insert into restaurants (
      id, slug, name, tagline, payment, tracking_messages, status, plan,
      twilio_mode, twilio_whatsapp_from, trial_ends_at, created_at, updated_at
    ) values (
      ${id},
      ${input.slug},
      ${input.name},
      ${input.tagline ?? ""},
      ${JSON.stringify(payment)}::jsonb,
      ${JSON.stringify(trackingMessages)}::jsonb,
      'trial',
      'trial',
      'platform',
      ${input.twilioWhatsappFrom ?? null},
      ${trialEndsAt},
      ${createdAt},
      ${createdAt}
    )
  `;
  await sql`
    insert into restaurant_order_number_seq (restaurant_id, next_order_number)
    values (${id}, 1001)
    on conflict (restaurant_id) do nothing
  `;
  const created = await getRestaurantById(id);
  if (!created) throw new Error("Failed to create restaurant");
  await ensureDefaultBranch(created.id);
  return created;
}

export async function updateRestaurant(
  id: string,
  patch: Partial<
    Pick<
      Restaurant,
      | "name"
      | "tagline"
      | "currency"
      | "deliveryFeeCents"
      | "payment"
      | "trackingMessages"
      | "status"
      | "plan"
      | "twilioMode"
      | "twilioAccountSid"
      | "twilioAuthTokenEncrypted"
      | "twilioWhatsappFrom"
      | "stripeCustomerId"
      | "stripeSubscriptionId"
      | "trialEndsAt"
    >
  >,
) {
  const existing = await getRestaurantById(id);
  if (!existing) throw new Error("Restaurant not found");

  if (!isDatabaseEnabled()) {
    const store = getMemoryRestaurantStore();
    const index = store.restaurants.findIndex((r) => r.id === id);
    store.restaurants[index] = {
      ...existing,
      ...patch,
      updatedAt: now(),
    };
    return store.restaurants[index]!;
  }

  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  await sql`
    update restaurants set
      name = ${patch.name ?? existing.name},
      tagline = ${patch.tagline ?? existing.tagline},
      currency = ${patch.currency ?? existing.currency},
      delivery_fee_cents = ${patch.deliveryFeeCents ?? existing.deliveryFeeCents},
      payment = ${JSON.stringify(patch.payment ?? existing.payment)}::jsonb,
      tracking_messages = ${JSON.stringify(patch.trackingMessages ?? existing.trackingMessages)}::jsonb,
      status = ${patch.status ?? existing.status},
      plan = ${patch.plan ?? existing.plan},
      twilio_mode = ${patch.twilioMode ?? existing.twilioMode},
      twilio_account_sid = ${patch.twilioAccountSid ?? existing.twilioAccountSid ?? null},
      twilio_auth_token_encrypted = ${patch.twilioAuthTokenEncrypted ?? existing.twilioAuthTokenEncrypted ?? null},
      twilio_whatsapp_from = ${patch.twilioWhatsappFrom ?? existing.twilioWhatsappFrom ?? null},
      stripe_customer_id = ${patch.stripeCustomerId ?? existing.stripeCustomerId ?? null},
      stripe_subscription_id = ${patch.stripeSubscriptionId ?? existing.stripeSubscriptionId ?? null},
      trial_ends_at = ${patch.trialEndsAt ?? existing.trialEndsAt ?? null},
      updated_at = ${now()}
    where id = ${id}
  `;
  const updated = await getRestaurantById(id);
  if (!updated) throw new Error("Restaurant not found after update");
  return updated;
}

export async function ensureDefaultRestaurant() {
  const existing = await getRestaurantById(DEFAULT_RESTAURANT_ID);
  if (existing) return existing;
  return createRestaurant({
    slug: defaultRestaurantSeed().slug,
    name: defaultRestaurantSeed().name,
    tagline: defaultRestaurantSeed().tagline,
    twilioWhatsappFrom: defaultRestaurantSeed().twilioWhatsappFrom,
  });
}

export async function cloneDefaultMenuToRestaurant(restaurantId: string) {
  const { seedCategories, seedMenuItems } = await import("@/data/seed-menu");

  if (!isDatabaseEnabled()) {
    const { getTenantStore } = await import("@/lib/store-memory");
    const store = getTenantStore(restaurantId);
    store.categories = seedCategories.map((category) => ({ ...category }));
    store.menuItems = seedMenuItems.map((item) => ({ ...item }));
    return;
  }

  const { getSql } = await import("@/lib/db");
  const sql = getSql();
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
        restaurant_id, id, category_id, name, description, price_cents,
        available, prep_minutes, option_groups, updated_at
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

// --- Users & members (memory + postgres) ---

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name?: string;
}) {
  if (!isDatabaseEnabled()) {
    const store = getMemoryRestaurantStore();
    if (store.users.some((u) => u.email === input.email)) {
      throw new Error("Email already registered");
    }
    const user: User = {
      id: randomUUID(),
      email: input.email,
      name: input.name,
      createdAt: now(),
    };
    store.users.push(user);
    store.passwordHashes[user.id] = input.passwordHash;
    return user;
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const id = randomUUID();
  const createdAt = now();
  await sql`
    insert into users (id, email, password_hash, name, created_at)
    values (${id}, ${input.email}, ${input.passwordHash}, ${input.name ?? null}, ${createdAt})
  `;
  return { id, email: input.email, name: input.name, createdAt };
}

export async function getUserByEmail(email: string) {
  if (!isDatabaseEnabled()) {
    const store = getMemoryRestaurantStore();
    const user = store.users.find((u) => u.email === email);
    if (!user) return undefined;
    return {
      user,
      passwordHash: store.passwordHashes[user.id],
    };
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    select id, email, password_hash, name, created_at
    from users where email = ${email} limit 1
  `;
  if (!rows[0]) return undefined;
  return {
    user: {
      id: rows[0].id as string,
      email: rows[0].email as string,
      name: (rows[0].name as string | null) ?? undefined,
      createdAt: rows[0].created_at as string,
    },
    passwordHash: rows[0].password_hash as string,
  };
}

export async function addRestaurantMember(input: {
  restaurantId: string;
  userId: string;
  role: MemberRole;
}) {
  if (!isDatabaseEnabled()) {
    const store = getMemoryRestaurantStore();
    const member: RestaurantMember = {
      restaurantId: input.restaurantId,
      userId: input.userId,
      role: input.role,
      createdAt: now(),
    };
    store.members.push(member);
    return member;
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const createdAt = now();
  await sql`
    insert into restaurant_members (restaurant_id, user_id, role, created_at)
    values (${input.restaurantId}, ${input.userId}, ${input.role}, ${createdAt})
    on conflict (restaurant_id, user_id) do update set role = excluded.role
  `;
  return {
    restaurantId: input.restaurantId,
    userId: input.userId,
    role: input.role,
    createdAt,
  };
}

export async function getMemberForUser(restaurantId: string, userId: string) {
  if (!isDatabaseEnabled()) {
    return getMemoryRestaurantStore().members.find(
      (m) => m.restaurantId === restaurantId && m.userId === userId,
    );
  }
  const { getSql } = await import("@/lib/db");
  const sql = getSql();
  const rows = await sql`
    select restaurant_id, user_id, role, created_at
    from restaurant_members
    where restaurant_id = ${restaurantId} and user_id = ${userId}
    limit 1
  `;
  if (!rows[0]) return undefined;
  return {
    restaurantId: rows[0].restaurant_id as string,
    userId: rows[0].user_id as string,
    role: rows[0].role as MemberRole,
    createdAt: rows[0].created_at as string,
  };
}
