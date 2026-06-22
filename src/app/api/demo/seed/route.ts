export const dynamic = "force-dynamic";

import { resetDemoData } from "@/lib/store";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

export async function POST(request: Request) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    const summary = await resetDemoData(restaurant.id, branch.id);
    return Response.json({
      ok: true,
      message: "Demo data reseeded",
      ...summary,
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
