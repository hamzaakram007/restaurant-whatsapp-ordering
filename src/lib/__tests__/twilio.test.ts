import { describe, expect, it } from "vitest";
import { twilioInboundSchema } from "@/lib/twilio";

describe("twilio inbound schema", () => {
  it("parses whatsapp inbound payload", () => {
    const parsed = twilioInboundSchema.parse({
      From: "whatsapp:+15550001111",
      To: "whatsapp:+14155238886",
      Body: "menu",
      NumMedia: "1",
      MediaUrl0: "https://api.twilio.com/media/abc",
      MediaContentType0: "image/jpeg",
    });

    expect(parsed.From).toContain("whatsapp:");
    expect(parsed.NumMedia).toBe(1);
    expect(parsed.MediaUrl0).toContain("twilio.com");
  });
});
