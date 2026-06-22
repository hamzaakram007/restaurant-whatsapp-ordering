export const dynamic = "force-dynamic";

import { getCategories, getMenuItems } from "@/lib/store";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

export async function GET(request: Request) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    const restaurantId = restaurant.id;
    const branchId = branch.id;
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;

    return Response.json({
      categories: await getCategories(restaurantId),
      items: await getMenuItems(restaurantId, branchId, categoryId),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
