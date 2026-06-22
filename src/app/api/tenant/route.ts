export const dynamic = "force-dynamic";

import { restaurantToConfig } from "@/lib/restaurant-store";
import {
  listActiveBranches,
  requireBranchFromRequest,
  tenantErrorResponse,
} from "@/lib/tenant-context";

export async function GET(request: Request) {
  try {
    const { restaurant, branch, config } = await requireBranchFromRequest(request);
    const branches = await listActiveBranches(restaurant.id);
    return Response.json({
      restaurant,
      branch,
      config,
      branches,
      restaurantConfig: restaurantToConfig(restaurant),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
