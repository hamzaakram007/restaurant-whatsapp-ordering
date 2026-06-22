export const dynamic = "force-dynamic";

import { isDatabaseEnabled } from "@/lib/db";
import { requireRestaurantFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

export async function GET(request: Request) {
  try {
    const restaurant = await requireRestaurantFromRequest(request);
    const publicAppUrl = process.env.PUBLIC_APP_URL ?? "";
    const requestOrigin = new URL(request.url).origin;
    const webhookBase = publicAppUrl || requestOrigin;

    const platformTwilio = Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    );
    const byoTwilio = Boolean(
      restaurant.twilioMode === "byo" &&
        restaurant.twilioAccountSid &&
        restaurant.twilioAuthTokenEncrypted,
    );
    const twilioConfigured = platformTwilio || byoTwilio;

    return Response.json({
      ready: twilioConfigured && isDatabaseEnabled(),
      twilioConfigured,
      twilioMode: restaurant.twilioMode,
      whatsappFrom: restaurant.twilioWhatsappFrom ?? null,
      database: isDatabaseEnabled(),
      publicAppUrl: publicAppUrl || null,
      publicAppUrlMatchesRequest:
        !publicAppUrl || publicAppUrl.replace(/\/$/, "") === requestOrigin.replace(/\/$/, ""),
      webhooks: {
        inbound: `${webhookBase.replace(/\/$/, "")}/api/twilio/whatsapp`,
        status: `${webhookBase.replace(/\/$/, "")}/api/twilio/status`,
      },
      sandbox: {
        joinNumber: "+1 415 523 8886",
        joinCommand: "join <your-sandbox-code>",
        senderExample:
          restaurant.twilioWhatsappFrom ??
          process.env.TWILIO_WHATSAPP_FROM ??
          "whatsapp:+14155238886",
      },
      checklist: [
        {
          id: "twilio-credentials",
          label: "Twilio credentials set",
          done: twilioConfigured,
        },
        {
          id: "database",
          label: "DATABASE_URL configured",
          done: isDatabaseEnabled(),
        },
        {
          id: "public-app-url",
          label: "PUBLIC_APP_URL matches this deployment",
          done:
            Boolean(publicAppUrl) &&
            publicAppUrl.replace(/\/$/, "") === requestOrigin.replace(/\/$/, ""),
        },
        {
          id: "webhook",
          label: "Twilio sandbox webhook points to inbound URL below",
          done: false,
        },
      ],
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
