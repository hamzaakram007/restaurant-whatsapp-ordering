export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { handleCustomerMessage } from "@/lib/conversation-engine";
import {
  parseTwilioForm,
  twimlMessages,
  twimlResponse,
  validateTwilioSignature,
} from "@/lib/twilio";

function publicBaseUrl(request: Request) {
  const configured = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const baseUrl = publicBaseUrl(request);
  return Response.json({
    ok: true,
    route: "restaurant-whatsapp-inbound",
    provider: "twilio",
    baseUrl,
    webhooks: {
      inbound: `${baseUrl}/api/twilio/whatsapp`,
      status: `${baseUrl}/api/twilio/status`,
    },
    instructions:
      "Set the WhatsApp sender inbound webhook to the inbound URL (HTTP POST).",
  });
}

export async function POST(request: Request) {
  const { params, message } = await parseTwilioForm(request);

  if (!validateTwilioSignature(request, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const result = await handleCustomerMessage({
    customerPhone: message.From,
    body: message.Body,
    mediaUrl: message.NumMedia > 0 ? message.MediaUrl0 : undefined,
    mediaContentType: message.MediaContentType0,
  });

  if (result.messages.length === 0) {
    return twimlResponse("Sorry, I could not prepare a reply. Please try again.");
  }

  return twimlMessages(result.messages);
}
