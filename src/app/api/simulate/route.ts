export const dynamic = "force-dynamic";

import { z } from "zod";
import { handleCustomerMessage } from "@/lib/conversation-engine";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const bodySchema = z.object({
  phone: z.string().default("whatsapp:+15550001111"),
  body: z.string().default("menu"),
  mediaUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    const restaurantId = restaurant.id;
    const body = bodySchema.parse(await request.json());
    const result = await handleCustomerMessage({
      restaurantId,
      branchId: branch.id,
      customerPhone: body.phone,
      body: body.body,
      mediaUrl: body.mediaUrl,
    });

    return Response.json(result);
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
