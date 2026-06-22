import { DEFAULT_BRANCH_SLUG } from "@/lib/branch-constants";
import {
  getBranchBySlug,
  getBranchByTwilioTo,
  getDefaultBranch,
  getRestaurantByCentralTwilioTo,
  listBranches,
} from "@/lib/branch-store";
import { getBranchConfig } from "@/lib/branch-menu";
import { DEFAULT_RESTAURANT_ID, DEFAULT_RESTAURANT_SLUG } from "@/lib/tenant-constants";
import {
  getRestaurantById,
  getRestaurantBySlug,
  getRestaurantByTwilioTo,
  restaurantToConfig,
} from "@/lib/restaurant-store";
import type { Branch, BranchConfig, Restaurant, RestaurantConfig } from "@/lib/types";

export type TwilioTarget =
  | { kind: "branch"; restaurant: Restaurant; branch: Branch }
  | { kind: "central"; restaurant: Restaurant; branch?: undefined }
  | { kind: "legacy"; restaurant: Restaurant; branch: Branch };

export async function getRestaurantConfig(restaurantId: string): Promise<RestaurantConfig> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) throw new Error("Restaurant not found");
  return restaurantToConfig(restaurant);
}

export async function resolveRestaurantFromSlug(slug: string) {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return undefined;
  if (restaurant.status === "suspended") return undefined;
  return restaurant;
}

/** @deprecated Use resolveTwilioTarget for branch-aware routing */
export async function resolveRestaurantFromTwilioTo(to: string) {
  const target = await resolveTwilioTarget(to);
  return target?.restaurant;
}

export async function resolveTwilioTarget(to: string): Promise<TwilioTarget | undefined> {
  const branch = await getBranchByTwilioTo(to);
  if (branch) {
    const restaurant = await getRestaurantById(branch.restaurantId);
    if (!restaurant || restaurant.status === "suspended") return undefined;
    return { kind: "branch", restaurant, branch };
  }

  const centralRestaurant = await getRestaurantByCentralTwilioTo(to);
  if (centralRestaurant) {
    if (centralRestaurant.status === "suspended") return undefined;
    return { kind: "central", restaurant: centralRestaurant };
  }

  const legacyRestaurant = await getRestaurantByTwilioTo(to);
  if (legacyRestaurant) {
    if (legacyRestaurant.status === "suspended") return undefined;
    const defaultBranch = await getDefaultBranch(legacyRestaurant.id);
    if (!defaultBranch) return undefined;
    return { kind: "legacy", restaurant: legacyRestaurant, branch: defaultBranch };
  }

  const fallback = await getRestaurantById(DEFAULT_RESTAURANT_ID);
  const fallbackBranch = await getDefaultBranch(DEFAULT_RESTAURANT_ID);
  if (fallback && fallbackBranch) {
    return { kind: "legacy", restaurant: fallback, branch: fallbackBranch };
  }
  return undefined;
}

export function parseTenantSlugFromRequest(request: Request) {
  const headerSlug = request.headers.get("x-restaurant-slug");
  if (headerSlug) return headerSlug;

  const url = new URL(request.url);
  const querySlug = url.searchParams.get("tenant");
  if (querySlug) return querySlug;

  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return process.env.DEFAULT_TENANT_SLUG ?? DEFAULT_RESTAURANT_SLUG;
  }

  const platformHost =
    process.env.NEXT_PUBLIC_PLATFORM_HOST?.split(":")[0]?.toLowerCase() ?? "";
  if (platformHost && hostname.endsWith(`.${platformHost}`)) {
    return hostname.slice(0, -(platformHost.length + 1)).split(".")[0] ?? null;
  }

  const parts = hostname.split(".");
  if (parts.length >= 3 && !hostname.endsWith(".vercel.app")) return parts[0] ?? null;
  return null;
}

export function parseBranchSlugFromRequest(request: Request) {
  const headerSlug = request.headers.get("x-branch-slug");
  if (headerSlug) return headerSlug;

  const url = new URL(request.url);
  const querySlug = url.searchParams.get("branch");
  if (querySlug) return querySlug;

  return null;
}

export async function requireRestaurantFromRequest(request: Request): Promise<Restaurant> {
  const slug = parseTenantSlugFromRequest(request);
  if (!slug) {
    throw new TenantResolutionError("Tenant not found", 404);
  }
  const restaurant = await resolveRestaurantFromSlug(slug);
  if (!restaurant) {
    throw new TenantResolutionError(`Unknown restaurant: ${slug}`, 404);
  }
  return restaurant;
}

export async function requireBranchFromRequest(request: Request): Promise<{
  restaurant: Restaurant;
  branch: Branch;
  config: BranchConfig;
}> {
  const restaurant = await requireRestaurantFromRequest(request);
  const branchSlug = parseBranchSlugFromRequest(request);
  const branch = branchSlug
    ? await getBranchBySlug(restaurant.id, branchSlug)
    : await getDefaultBranch(restaurant.id);

  if (!branch || !branch.active) {
    throw new TenantResolutionError(
      branchSlug ? `Unknown branch: ${branchSlug}` : "Branch not found",
      404,
    );
  }

  const config = await getBranchConfig(restaurant.id, branch.id);
  return { restaurant, branch, config };
}

export async function listActiveBranches(restaurantId: string) {
  return listBranches(restaurantId);
}

export class TenantResolutionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function tenantErrorResponse(error: unknown) {
  if (error instanceof TenantResolutionError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

export { DEFAULT_BRANCH_SLUG };
