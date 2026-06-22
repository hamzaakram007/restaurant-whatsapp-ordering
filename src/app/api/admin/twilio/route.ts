export const dynamic = "force-dynamic";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  encryptSecret,
  updateRestaurant,
} from "@/lib/restaurant-store";
import { getDefaultBranch, setCentralTwilioNumber, updateBranch } from "@/lib/branch-store";
import { requireRestaurantFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const patchSchema = z.object({
  twilioMode: z.enum(["platform", "byo"]).optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioWhatsappFrom: z.string().optional(),
  branchId: z.string().uuid().optional(),
  centralTwilioWhatsappFrom: z.string().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "owner") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await requireRestaurantFromRequest(request);
    if (session.restaurantId !== restaurant.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = patchSchema.parse(await request.json());
    const patch: Parameters<typeof updateRestaurant>[1] = {};

    if (body.twilioMode) {
      patch.twilioMode = body.twilioMode;
    }
    if (body.twilioAccountSid !== undefined) {
      patch.twilioAccountSid = body.twilioAccountSid || undefined;
    }
    if (body.twilioAuthToken) {
      patch.twilioAuthTokenEncrypted = encryptSecret(body.twilioAuthToken);
    }

    if (body.twilioWhatsappFrom !== undefined) {
      const branchId = body.branchId ?? (await getDefaultBranch(restaurant.id))?.id;
      if (branchId) {
        await updateBranch(branchId, {
          twilioWhatsappFrom: body.twilioWhatsappFrom || undefined,
        });
      } else {
        patch.twilioWhatsappFrom = body.twilioWhatsappFrom || undefined;
      }
    }

    if (body.centralTwilioWhatsappFrom !== undefined) {
      await setCentralTwilioNumber(
        restaurant.id,
        body.centralTwilioWhatsappFrom || undefined,
      );
    }

    const updated = await updateRestaurant(restaurant.id, patch);
    return Response.json({
      restaurant: {
        id: updated.id,
        twilioMode: updated.twilioMode,
        twilioAccountSid: updated.twilioAccountSid ?? null,
        twilioWhatsappFrom: updated.twilioWhatsappFrom ?? null,
        centralTwilioWhatsappFrom: updated.centralTwilioWhatsappFrom ?? null,
        hasAuthToken: Boolean(updated.twilioAuthTokenEncrypted),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return tenantErrorResponse(error);
  }
}
