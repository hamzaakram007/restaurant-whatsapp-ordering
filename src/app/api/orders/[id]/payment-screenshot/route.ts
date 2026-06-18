export const dynamic = "force-dynamic";

import { getOrderById } from "@/lib/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isTwilioMediaUrl(url: string) {
  return url.includes("api.twilio.com");
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const order = await getOrderById(id);

  if (!order?.paymentScreenshotUrl) {
    return new Response("Payment screenshot not found", { status: 404 });
  }

  const screenshotUrl = order.paymentScreenshotUrl;

  if (!isTwilioMediaUrl(screenshotUrl)) {
    return Response.redirect(screenshotUrl, 302);
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return new Response("Twilio credentials not configured", { status: 500 });
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(screenshotUrl, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    return new Response("Failed to fetch payment screenshot from Twilio", {
      status: response.status,
    });
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = await response.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=300",
    },
  });
}
