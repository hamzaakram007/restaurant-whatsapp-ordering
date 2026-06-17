export const dynamic = "force-dynamic";

import { isDatabaseEnabled } from "@/lib/db";
import { getStorageMode } from "@/lib/store";

export async function GET() {
  return Response.json({
    ok: true,
    service: "restaurant-whatsapp-ordering",
    storage: getStorageMode(),
    database: isDatabaseEnabled(),
    twilio: Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    ),
  });
}
