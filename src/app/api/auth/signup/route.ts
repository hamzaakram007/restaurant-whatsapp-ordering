export const dynamic = "force-dynamic";

import { z } from "zod";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import {
  addRestaurantMember,
  cloneDefaultMenuToRestaurant,
  createRestaurant,
  createUser,
  getRestaurantBySlug,
} from "@/lib/restaurant-store";
import { slugifyRestaurantName } from "@/lib/tenant-constants";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  restaurantName: z.string().min(1),
  slug: z.string().optional(),
});

async function uniqueSlug(base: string) {
  let candidate = base;
  let suffix = 1;
  while (await getRestaurantBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const baseSlug = body.slug?.trim() || slugifyRestaurantName(body.restaurantName);
    if (!baseSlug) {
      return Response.json({ error: "Invalid restaurant name" }, { status: 400 });
    }

    const slug = await uniqueSlug(baseSlug);
    const user = await createUser({
      email: body.email,
      passwordHash: hashPassword(body.password),
      name: body.restaurantName,
    });

    const restaurant = await createRestaurant({
      slug,
      name: body.restaurantName,
    });

    await addRestaurantMember({
      restaurantId: restaurant.id,
      userId: user.id,
      role: "owner",
    });

    await cloneDefaultMenuToRestaurant(restaurant.id);

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      restaurantId: restaurant.id,
      role: "owner",
    });

    return Response.json(
      {
        ok: true,
        restaurant: {
          id: restaurant.id,
          slug: restaurant.slug,
          name: restaurant.name,
        },
        user: {
          email: user.email,
          role: "owner",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("already")) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json({ error: "Signup failed" }, { status: 500 });
  }
}
