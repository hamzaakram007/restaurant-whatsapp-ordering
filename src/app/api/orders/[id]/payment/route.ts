export const dynamic = "force-dynamic";

import { z } from "zod";
import {
  notifyPaymentApproved,
  notifyPaymentRejected,
} from "@/lib/notifications";
import { getOrderById, updateOrder } from "@/lib/store";

const paymentSchema = z.object({
  action: z.enum(["approve", "reject"]),
  verifiedBy: z.string().default("counter"),
  reason: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const order = await getOrderById(id);

  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const body = paymentSchema.parse(await request.json());

  if (body.action === "approve") {
    const updated = await updateOrder(id, {
      status: "confirmed",
      paymentStatus: "paid",
      paymentVerifiedBy: body.verifiedBy,
      paymentVerifiedAt: new Date().toISOString(),
      paymentRejectionReason: undefined,
    });

    await notifyPaymentApproved(updated.customerPhone, updated.orderNumber);
    return Response.json({ order: updated });
  }

  const updated = await updateOrder(id, {
    status: "awaiting_payment",
    paymentStatus: "rejected",
    paymentRejectionReason: body.reason ?? "Payment could not be verified",
    paymentScreenshotUrl: undefined,
  });

  await notifyPaymentRejected(
    updated.customerPhone,
    updated.orderNumber,
    updated.paymentRejectionReason,
  );

  return Response.json({ order: updated });
}
