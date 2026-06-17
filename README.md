# Restaurant WhatsApp Ordering

WhatsApp ordering system for restaurants and coffee shops. Customers browse a menu, place delivery or takeaway orders, pay by bank transfer, upload a payment screenshot, and receive tracking updates. Staff use counter and kitchen dashboards with bell alerts.

## Quick start

```bash
cp .env.example .env.local
npm install
npm run db:migrate   # after setting DATABASE_URL
npm run dev
```

Open `http://localhost:3000` and click **Start WhatsApp Demo**.

| Screen | URL |
|--------|-----|
| Home | `/` |
| WhatsApp demo | `/demo` |
| Counter | `/dashboard` |
| Kitchen | `/kitchen` |
| Menu admin | `/admin/menu` |
| Twilio setup | `/admin/twilio` |

## Database (Neon Postgres)

This app uses a **dedicated Neon database** — separate from dermatology and Supabase.

1. Create a project at [console.neon.tech](https://console.neon.tech)
2. Set `DATABASE_URL` in `.env.local`
3. Run `npm run db:migrate`

See [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for full instructions.

Without `DATABASE_URL`, the app uses in-memory demo data (fine for quick local tests; not for production).

## Demo commands

```bash
npm run demo:seed   # Reseed sample orders (server must be running)
npm run demo:flow   # Automated ordering conversation
npm run verify:deploy
```

## Connect Twilio

1. Set Twilio env vars from `.env.example`
2. Point inbound webhook to `POST /api/twilio/whatsapp`
3. Follow [docs/TWILIO_SETUP.md](docs/TWILIO_SETUP.md)

## Docs

- [CLIENT_DEMO.md](docs/CLIENT_DEMO.md) — client presentation script
- [CLIENT_TWILIO_DEMO.md](docs/CLIENT_TWILIO_DEMO.md) — live WhatsApp demo runbook
- [DATABASE_SETUP.md](docs/DATABASE_SETUP.md) — Neon setup
- [TWILIO_SETUP.md](docs/TWILIO_SETUP.md) — WhatsApp connection
- [ORDER_STATES.md](docs/ORDER_STATES.md) — state machine
- [STAFF_INTERFACES.md](docs/STAFF_INTERFACES.md) — counter and kitchen

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm test` — unit tests
- `npm run db:migrate` — apply Neon schema and seeds
- `npm run demo:seed` — reseed demo orders
- `npm run verify:deploy` — check deployed URLs
