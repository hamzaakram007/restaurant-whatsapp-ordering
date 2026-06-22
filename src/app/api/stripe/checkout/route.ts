export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { requireRestaurantFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "owner") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await requireRestaurantFromRequest(request);
    if (session.restaurantId !== restaurant.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_STARTER_PRICE_ID;
    if (!stripeSecret || !priceId) {
      return Response.json(
        { error: "Stripe is not configured on this deployment" },
        { status: 503 },
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret);
    const origin = new URL(request.url).origin;

    const sessionUrl = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/admin/settings?tenant=${restaurant.slug}&billing=success`,
      cancel_url: `${origin}/admin/settings?tenant=${restaurant.slug}&billing=cancel`,
      customer_email: session.email,
      metadata: {
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
      },
    });

    return Response.json({ url: sessionUrl.url });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
