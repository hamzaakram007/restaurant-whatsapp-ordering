export const dynamic = "force-dynamic";

import { updateRestaurant } from "@/lib/restaurant-store";

export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeSecret);
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { restaurantId?: string };
      subscription?: string | null;
      customer?: string | null;
    };
    const restaurantId = session.metadata?.restaurantId;
    if (restaurantId) {
      await updateRestaurant(restaurantId, {
        status: "active",
        plan: "starter",
        stripeCustomerId: session.customer ?? undefined,
        stripeSubscriptionId: session.subscription ?? undefined,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as { metadata?: { restaurantId?: string } };
    const restaurantId = subscription.metadata?.restaurantId;
    if (restaurantId) {
      await updateRestaurant(restaurantId, { status: "suspended", plan: "trial" });
    }
  }

  return Response.json({ received: true });
}
