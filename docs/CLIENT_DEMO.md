# Client Demo Guide

Use this 10-minute script to present WhatsApp ordering on the multi-tenant SaaS platform. Each restaurant has its own subdomain, menu, and isolated orders.

## Before the meeting

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

Open these tabs for the default demo tenant (`brew-bite`):

1. `http://localhost:3000` — platform home / signup
2. `http://localhost:3000/demo?tenant=brew-bite` — WhatsApp chat simulator
3. `http://localhost:3000/dashboard?tenant=brew-bite` — counter
4. `http://localhost:3000/kitchen?tenant=brew-bite` — kitchen display

On production, use subdomains instead of `?tenant=`:

- `https://brew-bite.yourplatform.com/dashboard`
- `https://brew-bite.yourplatform.com/demo`

If dashboards look empty, click **Reseed demo data** on the home page or run:

```bash
npm run demo:seed
```

Default staff login (demo mode): `owner@brew-bite.test` / `password123`

## Demo script

### 1. Show the platform (30 seconds)

Explain that each cafe gets its own subdomain (`alis.yourplatform.com`), menu, WhatsApp number, and staff dashboards — all on one deployment with isolated data.

### 2. Customer ordering on WhatsApp (3 minutes)

Go to `/demo?tenant=brew-bite` and walk through:

1. Type `menu` or tap the menu quick action
2. Reply `1` for Coffee
3. Reply `1x2` to add two lattes
4. Reply `checkout`
5. Reply `1` for delivery (or `2` for takeaway)
6. Send an address or pickup time
7. Reply `yes` to confirm
8. Tap **Send payment screenshot**

Point out the clear numbered flow and order summary with total.

### 3. Counter payment verification (2 minutes)

Switch to `/dashboard?tenant=brew-bite`:

- Show order **#1001** waiting for payment verification (pre-seeded)
- Open the payment screenshot link
- Click **Approve payment**
- Mention the bell alert for new payment screenshots

### 4. Kitchen operations (2 minutes)

Switch to `/kitchen?tenant=brew-bite`:

- Show order **#1002** (confirmed, waiting for kitchen)
- Click **Acknowledge and start prep**
- Show order **#1003** already in kitchen

### 5. Order tracking (1 minute)

Return to `/demo?tenant=brew-bite` and type `track` to show the customer status view.

### 6. Multi-tenant isolation (1 minute)

Optional: sign up a second restaurant at `/signup`, open its subdomain, and show that orders and menus do not mix with `brew-bite`.

### 7. Wrap up (1 minute)

Show the home page and mention:

- `/admin/settings` for branding and payment details (per tenant)
- `/admin/twilio` for platform trial vs BYO Twilio
- Stripe upgrade after trial
- Future phases: online payments, rider tracking, multi-branch

## Pre-loaded demo orders

| Order | Customer | Status | Demo purpose |
|-------|----------|--------|--------------|
| #1001 | +923001112233 | payment_uploaded | Counter payment verification |
| #1002 | +923004445566 | confirmed | Kitchen acknowledge flow |
| #1003 | +923007778899 | in_kitchen | Active kitchen display |
| #1004 | +923001234567 | completed | Track order / history |
| #1005 | +923009998877 | awaiting_payment | Payment screenshot flow |

## Local dev without subdomains

Use the `?tenant=slug` query param on any route, or set `DEFAULT_TENANT_SLUG=brew-bite` in `.env.local` for localhost.

## Sales / prospect demos

Provision `demo-{slug}.yourplatform.com` with a platform Twilio sandbox number. Each prospect sees only their branding and orders.
