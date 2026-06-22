export const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000002";
export const DEFAULT_BRANCH_SLUG = "main";

export function branchStoreKey(restaurantId: string, branchId: string) {
  return `${restaurantId}:${branchId}`;
}
