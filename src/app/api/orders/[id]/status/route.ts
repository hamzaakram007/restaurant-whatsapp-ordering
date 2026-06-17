export const dynamic = "force-dynamic";

import { z } from "zod";
import { notifyCustomerOrderStatus } from "@/lib/notifications";
import { getOrderById, updateOrder } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

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
  const { id } = await context.params;
  const order = await getOrderById(id);

  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const body = bodySchema.parse(await request.json());
  const updated = await updateOrder(
    id,
    { status: body.status as OrderStatus },
    body.note,
  );

  await notifyCustomerOrderStatus(
    updated.customerPhone,
    updated.orderNumber,
    updated.status,
  );

  return Response.json({ order: updated });
}
