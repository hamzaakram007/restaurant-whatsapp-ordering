export const dynamic = "force-dynamic";

import { z } from "zod";
import {
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { getMemberForUser, getUserByEmail } from "@/lib/restaurant-store";
import { requireRestaurantFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const restaurant = await requireRestaurantFromRequest(request);
    const restaurantId = restaurant.id;
    const body = bodySchema.parse(await request.json());

    const record = await getUserByEmail(body.email);
    if (!record || !verifyPassword(body.password, record.passwordHash)) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const member = await getMemberForUser(restaurantId, record.user.id);
    if (!member) {
      return Response.json(
        { error: "You do not have access to this restaurant" },
        { status: 403 },
      );
    }

    await setSessionCookie({
      userId: record.user.id,
      email: record.user.email,
      name: record.user.name,
      restaurantId,
      role: member.role,
    });

    return Response.json({
      ok: true,
      user: {
        email: record.user.email,
        name: record.user.name,
        role: member.role,
      },
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return tenantErrorResponse(error);
  }
}
