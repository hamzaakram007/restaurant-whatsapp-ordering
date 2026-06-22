export const dynamic = "force-dynamic";

import { ensureStoreReady, listOrders } from "@/lib/store";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

export async function GET(request: Request) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    const restaurantId = restaurant.id;
    const branchId = branch.id;
    await ensureStoreReady(restaurantId, branchId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");

    const orders = await listOrders(restaurantId, branchId, {
      status: status ? (status.split(",") as never) : undefined,
      paymentStatus: paymentStatus ? (paymentStatus.split(",") as never) : undefined,
    });

    return Response.json({ orders });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
