import twilio, { validateRequest } from "twilio";
import { z } from "zod";
import { decryptSecret, getRestaurantById } from "@/lib/restaurant-store";
import type { BotMessage } from "@/lib/types";

export const twilioInboundSchema = z.object({
  MessageSid: z.string().optional(),
  From: z.string().min(1),
  To: z.string().min(1),
  Body: z.string().default(""),
  NumMedia: z.coerce.number().default(0),
  MediaUrl0: z.string().optional(),
  MediaContentType0: z.string().optional(),
});

export type TwilioInboundMessage = z.infer<typeof twilioInboundSchema>;

export async function parseTwilioForm(request: Request) {
  const formData = await request.formData();
  const params = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );

  return {
    params,
    message: twilioInboundSchema.parse(params),
  };
}

export function twilioWebhookUrl(request: Request, pathname = "/api/twilio/whatsapp") {
  const configured = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) {
    return `${configured}${pathname}`;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const url = new URL(request.url);
  return `${forwardedProto}://${forwardedHost ?? url.host}${pathname}`;
}

export function validateTwilioSignature(
  request: Request,
  params: Record<string, string>,
  restaurant?: {
    twilioMode?: string;
    twilioAuthTokenEncrypted?: string;
  },
) {
  const shouldValidate = process.env.TWILIO_VALIDATE_SIGNATURE !== "false";
  if (!shouldValidate) {
    return true;
  }

  let authToken = process.env.TWILIO_AUTH_TOKEN;
  if (restaurant?.twilioMode === "byo" && restaurant.twilioAuthTokenEncrypted) {
    authToken = decryptSecret(restaurant.twilioAuthTokenEncrypted);
  }

  if (!authToken) {
    return true;
  }

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const publicUrl = twilioWebhookUrl(request);

  return validateRequest(authToken, signature, publicUrl, params);
}

export function twimlResponse(body: string, status = 200) {
  if (!body.trim()) {
    const response = new twilio.twiml.MessagingResponse();
    return new Response(response.toString(), {
      status,
      headers: { "content-type": "text/xml" },
    });
  }

  return twimlMessages([{ body }], status);
}

export function twimlMessages(messages: BotMessage[], status = 200) {
  const response = new twilio.twiml.MessagingResponse();
  for (const item of messages) {
    const message = response.message(item.body);
    if (item.mediaUrl) {
      message.media(item.mediaUrl);
    }
  }

  return new Response(response.toString(), {
    status,
    headers: {
      "content-type": "text/xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function normalizeWhatsAppAddress(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  return `whatsapp:${trimmed.replace(/^whatsapp:/i, "")}`;
}

async function getTwilioCredentials(restaurantId: string) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) throw new Error("Restaurant not found");

  if (restaurant.twilioMode === "byo" && restaurant.twilioAccountSid) {
    return {
      accountSid: restaurant.twilioAccountSid,
      authToken: restaurant.twilioAuthTokenEncrypted
        ? decryptSecret(restaurant.twilioAuthTokenEncrypted)
        : process.env.TWILIO_AUTH_TOKEN,
      from:
        restaurant.twilioWhatsappFrom ??
        process.env.TWILIO_WHATSAPP_FROM ??
        "whatsapp:+14155238886",
    };
  }

  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from:
      restaurant.twilioWhatsappFrom ??
      process.env.TWILIO_WHATSAPP_FROM ??
      "whatsapp:+14155238886",
  };
}

export async function sendWhatsAppMessages(
  restaurantId: string,
  to: string,
  messages: BotMessage[],
) {
  const credentials = await getTwilioCredentials(restaurantId);

  if (!credentials.accountSid || !credentials.authToken) {
    console.warn("Twilio credentials missing; skipping outbound WhatsApp message");
    return [];
  }

  const client = twilio(credentials.accountSid, credentials.authToken);
  const sent = [];

  for (const item of messages) {
    sent.push(
      await client.messages.create({
        from: normalizeWhatsAppAddress(credentials.from),
        to: normalizeWhatsAppAddress(to),
        body: item.body,
        mediaUrl: item.mediaUrl ? [item.mediaUrl] : undefined,
        statusCallback: process.env.PUBLIC_APP_URL
          ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, "")}/api/twilio/status`
          : undefined,
      }),
    );
  }

  return sent;
}
