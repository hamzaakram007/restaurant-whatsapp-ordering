import { restaurantConfig } from "@/data/restaurant-config";

export function formatMoney(cents: number) {
  const amount = cents / 100;
  return `${restaurantConfig.currency} ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatOrderNumber(orderNumber: number) {
  return `#${String(orderNumber).padStart(4, "0")}`;
}
