# WhatsApp Provider Decision

## Selected provider: Twilio WhatsApp

For the MVP we use **Twilio WhatsApp** because it matches the plan's need for fast sandbox testing, webhook-based inbound handling, media attachments for payment screenshots, and status callbacks for delivery tracking.

## Why Twilio over Meta Cloud API for MVP

| Factor | Twilio WhatsApp | Meta Cloud API |
|--------|-----------------|----------------|
| Sandbox testing | Fast join-code sandbox | Requires Meta app + WABA setup |
| Webhook docs | Mature, consistent with SMS/MMS | Direct but more Meta onboarding |
| Media inbound | Supported via `MediaUrl0` | Supported |
| Sender ownership | Twilio-managed onboarding | Direct Meta ownership |
| Best for | MVP and pilot restaurants | Long-term direct Meta control |

## Production requirements

1. Register a production WhatsApp sender.
2. Configure inbound webhook: `POST /api/twilio/whatsapp`
3. Configure status callback: `POST /api/twilio/status`
4. Prepare approved templates for outbound updates outside the 24-hour customer service window.
5. Enable `TWILIO_VALIDATE_SIGNATURE=true` in production.

## Migration path

If a restaurant later wants direct Meta ownership, keep the conversation engine and order APIs provider-agnostic and swap only the messaging adapter in `src/lib/twilio.ts`.
