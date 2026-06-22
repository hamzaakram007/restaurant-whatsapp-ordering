export const dynamic = "force-dynamic";

import { z } from "zod";
import { notifyCustomerOrderStatus } from "@/lib/notifications";
import { getOrderById, updateOrder } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const bodySchema = z.object({
  status: z.enum([
    "confirmed",
    "in_kitchen",
    "ready",
    "out_for_delivery",
    "completed",
    "cancelled",
  ]),
  note: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    const restaurantId = restaurant.id;
    const branchId = branch.id;
    const { id } = await context.params;
    const order = await getOrderById(restaurantId, branchId, id);

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const updated = await updateOrder(
      restaurantId,
      branchId,
      id,
      { status: body.status as OrderStatus },
      body.note,
    );

    await notifyCustomerOrderStatus(
      restaurantId,
      updated.customerPhone,
      updated.orderNumber,
      updated.status,
      branchId,
    );

    return Response.json({ order: updated });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
