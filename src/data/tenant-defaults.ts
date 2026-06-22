import { restaurantConfig } from "@/data/restaurant-config";
import type { Restaurant, RestaurantPaymentConfig, RestaurantTrackingMessages } from "@/lib/types";

export function defaultPaymentConfig(): RestaurantPaymentConfig {
  return { ...restaurantConfig.payment };
}

export function defaultTrackingMessages(): RestaurantTrackingMessages {
  return { ...restaurantConfig.trackingMessages };
}

export function defaultRestaurantSeed(): Omit<Restaurant, "createdAt" | "updatedAt"> {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "brew-bite",
    name: restaurantConfig.name,
    tagline: restaurantConfig.tagline,
    currency: restaurantConfig.currency,
    deliveryFeeCents: restaurantConfig.deliveryFeeCents,
    payment: defaultPaymentConfig(),
    trackingMessages: defaultTrackingMessages(),
    status: "active",
    plan: "starter",
    twilioMode: "platform",
    twilioWhatsappFrom:
      process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
  };
}
