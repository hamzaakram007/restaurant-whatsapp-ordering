export const dynamic = "force-dynamic";

import { DEMO_CHAT_PHONE } from "@/data/demo-seed";
import { clearConversationForPhone } from "@/lib/store";
import { requireBranchFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

export async function POST(request: Request) {
  try {
    const { restaurant, branch } = await requireBranchFromRequest(request);
    await clearConversationForPhone(restaurant.id, branch.id, DEMO_CHAT_PHONE);
    return Response.json({
      ok: true,
      phone: DEMO_CHAT_PHONE,
      message: "Demo chat conversation cleared",
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
