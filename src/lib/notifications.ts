import type { OrderStatus, RestaurantTrackingMessages } from "@/lib/types";
import { sendWhatsAppMessages } from "@/lib/twilio";
import { getBranchConfig } from "@/lib/branch-menu";
import { getRestaurantConfig } from "@/lib/tenant-context";
import { formatMoney, formatOrderNumber } from "@/lib/format";

const statusToTrackingKey: Partial<
  Record<OrderStatus, keyof RestaurantTrackingMessages>
> = {
  confirmed: "confirmed",
  in_kitchen: "in_kitchen",
  ready: "ready",
  out_for_delivery: "out_for_delivery",
  completed: "completed",
};

async function getNotificationConfig(restaurantId: string, branchId?: string) {
  if (branchId) {
    return getBranchConfig(restaurantId, branchId);
  }
  return getRestaurantConfig(restaurantId);
}

export async function notifyCustomerOrderStatus(
  restaurantId: string,
  phone: string,
  orderNumber: number,
  status: OrderStatus,
  branchId?: string,
) {
  const key = statusToTrackingKey[status];
  if (!key) return;

  const config = await getNotificationConfig(restaurantId, branchId);
  const label = formatOrderNumber(orderNumber);
  const message = config.trackingMessages[key];

  await sendWhatsAppMessages(restaurantId, phone, [
    {
      body: `Order ${label}: ${message}`,
    },
  ]);
}

export async function notifyPaymentRejected(
  restaurantId: string,
  phone: string,
  orderNumber: number,
  reason?: string,
  branchId?: string,
) {
  const config = await getNotificationConfig(restaurantId, branchId);
  const label = formatOrderNumber(orderNumber);
  const body = [
    `Order ${label}: ${config.trackingMessages.payment_rejected}`,
    reason ? `Reason: ${reason}` : null,
    "Please transfer the exact total shown earlier and resend your screenshot.",
  ]
    .filter(Boolean)
    .join("\n");

  await sendWhatsAppMessages(restaurantId, phone, [{ body }]);
}

export async function notifyPaymentApproved(
  restaurantId: string,
  phone: string,
  orderNumber: number,
  branchId?: string,
) {
  const config = await getNotificationConfig(restaurantId, branchId);
  const label = formatOrderNumber(orderNumber);
  await sendWhatsAppMessages(restaurantId, phone, [
    {
      body: `Payment received for order ${label}. ${config.trackingMessages.confirmed}`,
    },
  ]);
}

export async function notifyOrderUpdated(
  restaurantId: string,
  phone: string,
  orderNumber: number,
  options: {
    cancelled?: boolean;
    totalCents?: number;
    paymentReset?: boolean;
  } = {},
  branchId?: string,
) {
  const config = await getNotificationConfig(restaurantId, branchId);
  const label = formatOrderNumber(orderNumber);
  const lines = options.cancelled
    ? [`Order ${label}: ${config.trackingMessages.order_cancelled}`]
    : [`Order ${label}: ${config.trackingMessages.order_updated}`];

  if (!options.cancelled && options.totalCents !== undefined) {
    lines.push(`New total: ${formatMoney(options.totalCents, config.currency)}`);
  }
  if (options.paymentReset) {
    lines.push(
      "Your payment needs to be verified again for the updated total. Please send an updated screenshot if you already paid.",
    );
  }

  await sendWhatsAppMessages(restaurantId, phone, [{ body: lines.join("\n") }]);
}
