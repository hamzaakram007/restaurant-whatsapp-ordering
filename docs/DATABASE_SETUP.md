# Neon Database Setup

The restaurant app uses **Neon Postgres** — a separate database from the dermatology project and from Supabase.

## 1. Create a Neon project

1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project named `restaurant-whatsapp-ordering`
3. Copy the **connection string** (starts with `postgresql://`)

## 2. Configure locally

```bash
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local` to your Neon connection string.

## 3. Apply schema and seed data

```bash
npm install
npm run db:migrate
```

This runs:

- `neon/schema.sql` — tables
- `neon/seed-menu.sql` — menu categories and items
- `neon/seed-demo.sql` — demo orders #1001–#1005

## 4. Verify

```bash
npm run dev
```

Open `http://localhost:3000/api/health` — expect:

```json
{
  "storage": "neon-postgres",
  "database": true
}
```

## 5. Vercel production

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Restaurant Neon connection string only |
| `SEED_DEMO_DATA` | `true` for client demos |
| `DEMO_MODE` | `true` |
| `PUBLIC_APP_URL` | Your Vercel production URL |

Run `npm run db:migrate` once against the production Neon URL before or after first deploy (schema is not auto-applied during build).

## Reseed demo orders

```bash
npm run demo:seed
```

Or use **Reseed demo data** on the home page / `POST /api/demo/seed`.

## Without DATABASE_URL

The app falls back to **in-memory demo mode** for local testing. Data resets on server restart and does not persist on Vercel — always set `DATABASE_URL` in production.
