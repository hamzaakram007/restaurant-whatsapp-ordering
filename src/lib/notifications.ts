import { restaurantConfig } from "@/data/restaurant-config";
import type { OrderStatus } from "@/lib/types";
import { sendWhatsAppMessages } from "@/lib/twilio";
import { formatMoney, formatOrderNumber } from "@/lib/format";

const statusToTrackingKey: Partial<
  Record<OrderStatus, keyof typeof restaurantConfig.trackingMessages>
> = {
  confirmed: "confirmed",
  in_kitchen: "in_kitchen",
  ready: "ready",
  out_for_delivery: "out_for_delivery",
  completed: "completed",
};

export async function notifyCustomerOrderStatus(
  phone: string,
  orderNumber: number,
  status: OrderStatus,
) {
  const key = statusToTrackingKey[status];
  if (!key) return;

  const label = formatOrderNumber(orderNumber);
  const message = restaurantConfig.trackingMessages[key];

  await sendWhatsAppMessages(phone, [
    {
      body: `Order ${label}: ${message}`,
    },
  ]);
}

export async function notifyPaymentRejected(
  phone: string,
  orderNumber: number,
  reason?: string,
) {
  const label = formatOrderNumber(orderNumber);
  const body = [
    `Order ${label}: ${restaurantConfig.trackingMessages.payment_rejected}`,
    reason ? `Reason: ${reason}` : null,
    "Please transfer the exact total shown earlier and resend your screenshot.",
  ]
    .filter(Boolean)
    .join("\n");

  await sendWhatsAppMessages(phone, [{ body }]);
}

export async function notifyPaymentApproved(phone: string, orderNumber: number) {
  const label = formatOrderNumber(orderNumber);
  await sendWhatsAppMessages(phone, [
    {
      body: `Payment received for order ${label}. ${restaurantConfig.trackingMessages.confirmed}`,
    },
  ]);
}
