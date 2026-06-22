export const dynamic = "force-dynamic";

import { z } from "zod";
import { isOrderEditable, shouldResetPaymentAfterEdit } from "@/lib/order-edit";
import { notifyOrderUpdated } from "@/lib/notifications";
import {
  cancelOrder,
  getOrderById,
  getOrderEvents,
  replaceOrderItems,
  updateOrderDetails,
} from "@/lib/store";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const selectedOptionSchema = z.object({
  groupId: z.string(),
  choiceId: z.string(),
  label: z.string(),
  priceDeltaCents: z.number().int(),
});

const cartLineSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
  lineKey: z.string(),
  selectedOptions: z.array(selectedOptionSchema).default([]),
  notes: z.string().optional(),
});

const patchSchema = z
  .object({
    items: z.array(cartLineSchema).optional(),
    deliveryAddress: z.string().optional(),
    pickupTime: z.string().optional(),
    fulfillmentType: z.enum(["delivery", "takeaway"]).optional(),
    notes: z.string().optional(),
    cancel: z.boolean().optional(),
    updatedBy: z.enum(["staff", "customer"]).optional(),
  })
  .refine(
    (body) =>
      body.cancel === true ||
      body.items !== undefined ||
      body.deliveryAddress !== undefined ||
      body.pickupTime !== undefined ||
      body.fulfillmentType !== undefined ||
      body.notes !== undefined,
    { message: "At least one field is required" },
  );

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    const restaurantId = restaurant.id;
    const branchId = branch.id;
    const { id } = await context.params;
    const order = await getOrderById(restaurantId, branchId, id);

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    return Response.json({
      order,
      events: await getOrderEvents(restaurantId, branchId, id),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

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

    if (!isOrderEditable(order)) {
      return Response.json(
        { error: "Order can no longer be edited" },
        { status: 409 },
      );
    }

    const body = patchSchema.parse(await request.json());
    const actor = body.updatedBy === "customer" ? "customer" : "staff";
    const eventNote = `Order updated by ${actor}`;

    if (body.cancel) {
      const updated = await cancelOrder(restaurantId, branchId, id, `Order cancelled by ${actor}`);
      await notifyOrderUpdated(restaurantId, updated.customerPhone, updated.orderNumber, {
        cancelled: true,
      }, branchId);
      return Response.json({ order: updated });
    }

    const previousTotal = order.totalCents;
    const wasPaid = order.paymentStatus === "paid";
    let updated = order;

    if (body.items) {
      updated = await replaceOrderItems(restaurantId, branchId, id, body.items, eventNote);
    }

    const detailsPatch: Parameters<typeof updateOrderDetails>[3] = {};
    if (body.deliveryAddress !== undefined) {
      detailsPatch.deliveryAddress = body.deliveryAddress;
    }
    if (body.pickupTime !== undefined) {
      detailsPatch.pickupTime = body.pickupTime;
    }
    if (body.fulfillmentType !== undefined) {
      detailsPatch.fulfillmentType = body.fulfillmentType;
    }
    if (body.notes !== undefined) {
      detailsPatch.notes = body.notes;
    }

    if (Object.keys(detailsPatch).length > 0) {
      updated = await updateOrderDetails(
        restaurantId,
        branchId,
        id,
        detailsPatch,
        body.items ? undefined : eventNote,
      );
    }

    const paymentReset =
      wasPaid &&
      (shouldResetPaymentAfterEdit(order, updated.totalCents) ||
        updated.totalCents !== previousTotal);

    await notifyOrderUpdated(restaurantId, updated.customerPhone, updated.orderNumber, {
      totalCents: updated.totalCents,
      paymentReset,
    }, branchId);

    return Response.json({ order: updated });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
