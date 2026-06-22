export const dynamic = "force-dynamic";

import { getDemoStats } from "@/lib/store";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

export async function GET(request: Request) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    const stats = await getDemoStats(restaurant.id, branch.id);
    const twilioConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    );

    return Response.json({
      demoMode: process.env.DEMO_MODE !== "false",
      seedDemoData: process.env.SEED_DEMO_DATA !== "false",
      database: Boolean(process.env.DATABASE_URL),
      twilioConfigured,
      ...stats,
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
