# Twilio WhatsApp Setup

Connect real WhatsApp for a restaurant tenant. The platform uses a **hybrid** model:

- **Platform mode (trial):** shared platform Twilio account and sandbox/production number pool
- **BYO mode (production):** restaurant enters their own Account SID, Auth Token, and WhatsApp sender

Inbound routing is always by the Twilio **`To`** number → `restaurants.twilio_whatsapp_from`. The webhook URL is shared across all tenants.

## Prerequisites

- Twilio account (sandbox works for testing)
- Deployed HTTPS URL (Vercel recommended) or ngrok for local testing
- WhatsApp mobile app to join sandbox
- Wildcard domain on Vercel: `*.yourplatform.com`

## Step 1: Environment variables

Copy `.env.example` to `.env.local` (local) or set in Vercel (production):

| Variable | Example | Notes |
|----------|---------|-------|
| `TWILIO_ACCOUNT_SID` | `AC...` | Platform Twilio account (trial tenants) |
| `TWILIO_AUTH_TOKEN` | secret | Never commit |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | Default platform sender |
| `TWILIO_VALIDATE_SIGNATURE` | `false` locally, `true` prod | Webhook security |
| `PUBLIC_APP_URL` | `https://yourplatform.com` | Used for signature validation |
| `TENANT_SECRETS_KEY` | random string | Encrypts BYO auth tokens in DB |
| `DEFAULT_TENANT_SLUG` | `brew-bite` | Localhost fallback tenant |
| `SEED_DEMO_DATA` | `true` or `false` | Set `false` in production if you want empty store |

Per-tenant BYO credentials are stored encrypted via `/admin/twilio` (owner only).

## Step 2: Configure a tenant

1. Open `https://{slug}.yourplatform.com/admin/twilio` (or `?tenant=slug` locally)
2. Choose **Platform** for trial or **Bring your own Twilio** for production
3. Set the WhatsApp sender (`whatsapp:+...`) — must match the number customers message
4. Copy the **Inbound webhook URL** into Twilio Console

Webhook (shared for all tenants):

```text
https://yourplatform.com/api/twilio/whatsapp
```

Method: `POST`

Optional status callback:

```text
https://yourplatform.com/api/twilio/status
```

## Step 3: Sandbox testing (fastest)

1. In Twilio Console go to **Messaging → Try it out → Send a WhatsApp message**
2. Join the sandbox from your phone: send `join <your-code>` to `+1 415 523 8886`
3. Set **When a message comes in** to the inbound webhook URL above
4. Assign the sandbox sender to the tenant in `/admin/twilio`
5. Verify webhook info:

```text
GET https://yourplatform.com/api/twilio/whatsapp
```

## Step 4: Test live WhatsApp

1. Message the tenant's WhatsApp number from a joined phone
2. Send `menu` to start ordering
3. Complete an order and send a payment screenshot
4. Approve it on `https://{slug}.yourplatform.com/dashboard`

## Step 5: BYO production sender

1. Restaurant owner switches mode to **BYO** on `/admin/twilio`
2. Enters Account SID, Auth Token, and approved WhatsApp sender
3. Sets the same inbound webhook URL on their Twilio account
4. Signature validation uses the **tenant's** auth token (keyed by `To` number)
5. Prepare approved message templates for outbound updates outside the 24-hour window

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Webhook returns 403 | Check `TWILIO_VALIDATE_SIGNATURE` and `PUBLIC_APP_URL`; for BYO, verify tenant auth token |
| No reply on WhatsApp | Confirm sandbox join; check `restaurants.twilio_whatsapp_from` matches `To` |
| Wrong restaurant menu | `To` number not unique or not set on restaurant row |
| Outbound tracking fails | Customer may be outside 24h window — use approved templates |
| Dashboard empty after deploy | Call `POST /api/demo/seed` or set `SEED_DEMO_DATA=true` |

## Local development with ngrok

```bash
npm run dev
ngrok http 3000
```

Set `PUBLIC_APP_URL` to the ngrok HTTPS URL and point Twilio sandbox webhook to `/api/twilio/whatsapp`.

Use `?tenant=brew-bite` on staff URLs when not using subdomains locally.
