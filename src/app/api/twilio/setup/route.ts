export const dynamic = "force-dynamic";

import { isDatabaseEnabled } from "@/lib/db";

export async function GET(request: Request) {
  const publicAppUrl = process.env.PUBLIC_APP_URL ?? "";
  const requestOrigin = new URL(request.url).origin;
  const webhookBase = publicAppUrl || requestOrigin;

  const twilioConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
  );

  return Response.json({
    ready: twilioConfigured && isDatabaseEnabled(),
    twilioConfigured,
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
      senderExample: process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
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
}
