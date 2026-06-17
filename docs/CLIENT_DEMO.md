# Client Demo Guide

Use this 10-minute script to present Brew & Bite Cafe WhatsApp ordering to restaurant or coffee shop clients.

## Before the meeting

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

Open these tabs:

1. `http://localhost:3000` — home with live stats
2. `http://localhost:3000/demo` — WhatsApp chat simulator
3. `http://localhost:3000/dashboard` — counter
4. `http://localhost:3000/kitchen` — kitchen display

If dashboards look empty, click **Reseed demo data** on the home page or run:

```bash
npm run demo:seed
```

## Demo script

### 1. Show the problem (30 seconds)

Explain that customers already use WhatsApp. This system lets them order without installing an app, while staff get structured orders instead of long chat threads.

### 2. Customer ordering on WhatsApp (3 minutes)

Go to `/demo` and walk through:

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

Switch to `/dashboard`:

- Show order **#1001** waiting for payment verification (pre-seeded)
- Open the payment screenshot link
- Click **Approve payment**
- Mention the bell alert for new payment screenshots

### 4. Kitchen operations (2 minutes)

Switch to `/kitchen`:

- Show order **#1002** (confirmed, waiting for kitchen)
- Click **Acknowledge and start prep**
- Show order **#1003** already in kitchen

### 5. Order tracking (1 minute)

Return to `/demo` and type `track` to show the customer status view.

### 6. Wrap up (1 minute)

Show the home page stats and mention:

- Menu admin for updating prices and items
- Twilio connection for real WhatsApp (see `TWILIO_SETUP.md`)
- Future phases: online payments, rider tracking, multi-branch

## Pre-loaded demo orders

| Order | Customer | Status | Demo purpose |
|-------|----------|--------|--------------|
| #1001 | Ali Khan | Payment uploaded | Approve on counter |
| #1002 | Sara Ahmed | Confirmed | Kitchen bell + acknowledge |
| #1003 | Omar Hassan | In kitchen | Already prepping |
| #1004 | Fatima Noor | Ready | Mark complete on counter |
| #1005 | Hassan Raza | Completed | Tracking/history example |

## Automated demo flow

Run a full bot conversation from the terminal (dev server must be running):

```bash
npm run demo:flow
```

## Tips

- Use two monitors: `/demo` on one, dashboards on the other
- Click **Reset chat** on `/demo` between live walkthroughs
- Click **Reseed demo data** to restore sample orders after testing
