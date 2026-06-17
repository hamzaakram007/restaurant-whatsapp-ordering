export const dynamic = "force-dynamic";

import { DEMO_CHAT_PHONE } from "@/data/demo-seed";
import { clearConversationForPhone } from "@/lib/store";

export async function POST() {
  await clearConversationForPhone(DEMO_CHAT_PHONE);
  return Response.json({
    ok: true,
    phone: DEMO_CHAT_PHONE,
    message: "Demo chat conversation cleared",
  });
}
