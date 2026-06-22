export const dynamic = "force-dynamic";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createBranch, listBranches, updateBranch } from "@/lib/branch-store";
import { slugifyRestaurantName } from "@/lib/tenant-constants";
import { requireRestaurantFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  twilioWhatsappFrom: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  twilioWhatsappFrom: z.string().optional(),
  deliveryFeeCents: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const restaurant = await requireRestaurantFromRequest(request);
    const branches = await listBranches(restaurant.id);
    return Response.json({ branches });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

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

    const body = createSchema.parse(await request.json());
    const slug = body.slug?.trim() || slugifyRestaurantName(body.name);
    const branch = await createBranch({
      restaurantId: restaurant.id,
      slug,
      name: body.name,
      city: body.city,
      address: body.address,
      twilioWhatsappFrom: body.twilioWhatsappFrom,
    });
    return Response.json({ branch }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("already")) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return tenantErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "owner") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const restaurant = await requireRestaurantFromRequest(request);
    const body = patchSchema.parse(await request.json());
    const branches = await listBranches(restaurant.id);
    if (!branches.some((b) => b.id === body.id)) {
      return Response.json({ error: "Branch not found" }, { status: 404 });
    }
    const updated = await updateBranch(body.id, {
      name: body.name,
      city: body.city,
      address: body.address,
      twilioWhatsappFrom: body.twilioWhatsappFrom,
      deliveryFeeCents: body.deliveryFeeCents,
      active: body.active,
    });
    return Response.json({ branch: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return tenantErrorResponse(error);
  }
}
