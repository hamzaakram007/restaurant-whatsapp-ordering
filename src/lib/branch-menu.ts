import {
  getBranchById,
  getBranchOnlyItems,
  getBranchOverrides,
} from "@/lib/branch-store";
import { getRestaurantById, restaurantToConfig } from "@/lib/restaurant-store";
import { getAllMenuItems } from "@/lib/store";
import type { BranchConfig, RestaurantConfig } from "@/lib/types";

export async function getEffectiveMenuItems(
  restaurantId: string,
  branchId: string,
  categoryId?: string,
  includeUnavailable = false,
) {
  const masterItems = await getAllMenuItems(restaurantId, categoryId);
  const overrides = await getBranchOverrides(branchId);
  const overrideMap = new Map(overrides.map((o) => [o.menuItemId, o]));
  const branchOnly = await getBranchOnlyItems(branchId);

  const mergedMaster = masterItems.map((item) => {
    const override = overrideMap.get(item.id);
    if (!override) return item;
    return {
      ...item,
      name: override.name ?? item.name,
      description: override.description ?? item.description,
      priceCents: override.priceCents ?? item.priceCents,
      available: override.available ?? item.available,
    };
  });

  let items = [...mergedMaster, ...branchOnly];
  if (categoryId) {
    items = items.filter((item) => item.categoryId === categoryId);
  }
  if (!includeUnavailable) {
    items = items.filter((item) => item.available);
  }
  return items;
}

export async function getEffectiveMenuItemById(
  restaurantId: string,
  branchId: string,
  id: string,
) {
  const items = await getEffectiveMenuItems(restaurantId, branchId, undefined, true);
  return items.find((item) => item.id === id);
}

export async function getBranchConfig(
  restaurantId: string,
  branchId: string,
): Promise<BranchConfig> {
  const restaurant = await getRestaurantById(restaurantId);
  const branch = await getBranchById(branchId);
  if (!restaurant || !branch) throw new Error("Branch not found");

  const base = restaurantToConfig(restaurant);
  return {
    ...base,
    branchId: branch.id,
    branchName: branch.name,
    branchSlug: branch.slug,
    deliveryFeeCents: branch.deliveryFeeCents ?? base.deliveryFeeCents,
    payment: branch.payment ?? base.payment,
    whatsappSender:
      branch.twilioWhatsappFrom ??
      restaurant.centralTwilioWhatsappFrom ??
      base.whatsappSender,
  };
}

export function mergeConfigWithBranch(
  config: RestaurantConfig,
  branch: { id: string; name: string; slug: string; deliveryFeeCents?: number; payment?: RestaurantConfig["payment"]; twilioWhatsappFrom?: string },
): BranchConfig {
  return {
    ...config,
    branchId: branch.id,
    branchName: branch.name,
    branchSlug: branch.slug,
    deliveryFeeCents: branch.deliveryFeeCents ?? config.deliveryFeeCents,
    payment: branch.payment ?? config.payment,
    whatsappSender: branch.twilioWhatsappFrom ?? config.whatsappSender,
  };
}
