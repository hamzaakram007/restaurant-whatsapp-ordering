export const dynamic = "force-dynamic";

import { z } from "zod";
import {
  notifyPaymentApproved,
  notifyPaymentRejected,
} from "@/lib/notifications";
import { getOrderById, updateOrder } from "@/lib/store";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const paymentSchema = z.object({
  action: z.enum(["approve", "reject"]),
  verifiedBy: z.string().default("counter"),
  reason: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    const restaurantId = restaurant.id;
    const branchId = branch.id;
    const { id } = await context.params;
    const order = await getOrderById(restaurantId, branchId, id);

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const body = paymentSchema.parse(await request.json());

    if (body.action === "approve") {
      const updated = await updateOrder(restaurantId, branchId, id, {
        status: "confirmed",
        paymentStatus: "paid",
        paymentVerifiedBy: body.verifiedBy,
        paymentVerifiedAt: new Date().toISOString(),
        paymentRejectionReason: undefined,
      });

      await notifyPaymentApproved(
        restaurantId,
        updated.customerPhone,
        updated.orderNumber,
        branchId,
      );
      return Response.json({ order: updated });
    }

    const updated = await updateOrder(restaurantId, branchId, id, {
      status: "awaiting_payment",
      paymentStatus: "rejected",
      paymentRejectionReason: body.reason ?? "Payment could not be verified",
      paymentScreenshotUrl: undefined,
    });

    await notifyPaymentRejected(
      restaurantId,
      updated.customerPhone,
      updated.orderNumber,
      updated.paymentRejectionReason,
      branchId,
    );

    return Response.json({ order: updated });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
