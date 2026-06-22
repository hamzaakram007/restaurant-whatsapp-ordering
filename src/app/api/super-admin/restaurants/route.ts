export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { listRestaurants } from "@/lib/restaurant-store";

export async function GET() {
  const session = await getSessionUser();
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

  if (!superAdminEmail || !session || session.email !== superAdminEmail) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const restaurants = await listRestaurants();
  return Response.json({
    restaurants: restaurants.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      plan: r.plan,
      twilioMode: r.twilioMode,
      trialEndsAt: r.trialEndsAt,
      createdAt: r.createdAt,
    })),
  });
}
