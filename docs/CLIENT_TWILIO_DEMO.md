# Live WhatsApp Client Demo (10 minutes)

Use this runbook when presenting to a client on **real WhatsApp** via the Twilio sandbox.

## Before the meeting

1. Open **Twilio Setup** at `/admin/twilio` on production
2. Confirm checklist: credentials, database, `PUBLIC_APP_URL`
3. Join sandbox from your phone: send `join <code>` to `+1 415 523 8886`
4. Set Twilio sandbox inbound webhook to `POST /api/twilio/whatsapp` (copy URL from setup page)

## Demo script

| Step | Who | Action |
|------|-----|--------|
| 1 | You | Show home page and explain delivery + payment screenshot flow |
| 2 | Client phone | Send `menu` to sandbox number |
| 3 | Client | Pick Coffee → Latte → choose **Medium** size |
| 4 | Client | Reply `skip` for optional milk/extras (or pick Oat milk) |
| 5 | Client | `checkout` → delivery → send address → `yes` |
| 6 | Client | Send payment screenshot image |
| 7 | You | Open `/dashboard`, approve payment, show screenshot via proxy link |
| 8 | You | Open `/kitchen`, acknowledge order |

## Fallback

If Twilio is not connected yet, use `/demo` chat simulator with the same script.

## Env vars (Vercel production)

- `DATABASE_URL` — Neon (required for persistent orders)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` — sandbox: `whatsapp:+14155238886`
- `PUBLIC_APP_URL` — e.g. `https://restaurant-whatsapp-ordering.vercel.app`
- `TWILIO_VALIDATE_SIGNATURE` — `true` in production

## Verify

```bash
BASE_URL=https://restaurant-whatsapp-ordering.vercel.app npm run verify:deploy
```

Should report `neon-postgres` and Twilio webhook info from `/api/twilio/whatsapp`.
