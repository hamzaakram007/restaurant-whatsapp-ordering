export const dynamic = "force-dynamic";

import { z } from "zod";
import { handleCustomerMessage } from "@/lib/conversation-engine";

const bodySchema = z.object({
  phone: z.string().default("whatsapp:+15550001111"),
  body: z.string().default("menu"),
  mediaUrl: z.string().optional(),
});

export async function POST(request: Request) {
  const body = bodySchema.parse(await request.json());
  const result = await handleCustomerMessage({
    customerPhone: body.phone,
    body: body.body,
    mediaUrl: body.mediaUrl,
  });

  return Response.json(result);
}
