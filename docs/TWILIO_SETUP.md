# Twilio WhatsApp Setup

Connect real WhatsApp after the client demo. The app works in simulate mode without Twilio until you complete this checklist.

## Prerequisites

- Twilio account (sandbox works for testing)
- Deployed HTTPS URL (Vercel recommended) or ngrok for local testing
- WhatsApp mobile app to join sandbox

## Step 1: Environment variables

Copy `.env.example` to `.env.local` (local) or set in Vercel (production):

| Variable | Example | Notes |
|----------|---------|-------|
| `TWILIO_ACCOUNT_SID` | `AC...` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | secret | Never commit |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | Sandbox or production sender |
| `TWILIO_VALIDATE_SIGNATURE` | `false` locally, `true` prod | Webhook security |
| `PUBLIC_APP_URL` | `https://your-app.vercel.app` | Used for signature validation |
| `SEED_DEMO_DATA` | `true` or `false` | Set `false` in production if you want empty store |

## Step 2: Sandbox testing (fastest)

1. In Twilio Console go to **Messaging → Try it out → Send a WhatsApp message**
2. Join the sandbox from your phone: send `join <your-code>` to `+1 415 523 8886`
3. Set **When a message comes in** webhook to:

```text
https://your-app.vercel.app/api/twilio/whatsapp
```

Method: `POST`

4. Optional status callback:

```text
https://your-app.vercel.app/api/twilio/status
```

5. Verify webhook info:

```text
GET https://your-app.vercel.app/api/twilio/whatsapp
```

## Step 3: Test live WhatsApp

1. Message your Twilio sandbox number from the phone that joined
2. Send `menu` to start ordering
3. Complete an order and send a payment screenshot from your phone
4. Approve it on `/dashboard`

## Step 4: Production sender

For a real business number:

1. Register a WhatsApp sender in Twilio Console
2. Complete Meta Business verification if required
3. Update `TWILIO_WHATSAPP_FROM` to your approved sender
4. Set `TWILIO_VALIDATE_SIGNATURE=true`
5. Prepare approved message templates for outbound updates outside the 24-hour customer window

See [PROVIDER_DECISION.md](PROVIDER_DECISION.md) for why Twilio was chosen for MVP.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Webhook returns 403 | Check `TWILIO_VALIDATE_SIGNATURE` and `PUBLIC_APP_URL` |
| No reply on WhatsApp | Confirm sandbox join code; check Twilio debugger logs |
| Outbound tracking fails | Customer may be outside 24h window — use approved templates |
| Dashboard empty after deploy | Call `POST /api/demo/seed` or set `SEED_DEMO_DATA=true` |

## Local development with ngrok

```bash
npm run dev
ngrok http 3000
```

Set Twilio webhook to `https://<ngrok-id>.ngrok.io/api/twilio/whatsapp` and set `PUBLIC_APP_URL` to the same ngrok URL.
