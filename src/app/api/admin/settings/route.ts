export const dynamic = "force-dynamic";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updateRestaurant } from "@/lib/restaurant-store";
import type { RestaurantPaymentConfig, RestaurantTrackingMessages } from "@/lib/types";
import { requireRestaurantFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const paymentSchema = z.object({
  accountTitle: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  iban: z.string(),
  instructions: z.string(),
});

const trackingSchema = z.object({
  confirmed: z.string(),
  in_kitchen: z.string(),
  ready: z.string(),
  out_for_delivery: z.string(),
  completed: z.string(),
  payment_rejected: z.string(),
  order_updated: z.string(),
  order_cancelled: z.string(),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().optional(),
  currency: z.string().min(1).optional(),
  deliveryFeeCents: z.number().int().min(0).optional(),
  payment: paymentSchema.optional(),
  trackingMessages: trackingSchema.optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== "owner" && session.role !== "counter")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await requireRestaurantFromRequest(request);
    if (session.restaurantId !== restaurant.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = patchSchema.parse(await request.json());
    const updated = await updateRestaurant(restaurant.id, {
      name: body.name,
      tagline: body.tagline,
      currency: body.currency,
      deliveryFeeCents: body.deliveryFeeCents,
      payment: body.payment as RestaurantPaymentConfig | undefined,
      trackingMessages: body.trackingMessages as RestaurantTrackingMessages | undefined,
    });

    return Response.json({ restaurant: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return tenantErrorResponse(error);
  }
}
