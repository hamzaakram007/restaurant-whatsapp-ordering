# Staff Interfaces

## Counter dashboard (`/dashboard`)

Purpose: payment verification and order lifecycle control.

Features:
- Polls `/api/orders` every 4 seconds
- Highlights orders with `payment_uploaded` status
- Plays a bell sound when a new payment screenshot arrives
- Shows payment screenshot link for manual review
- Approve payment → `confirmed` + WhatsApp confirmation to customer
- Reject payment → `awaiting_payment` + WhatsApp rejection message
- Status buttons: send to kitchen, mark ready, out for delivery, complete

## Kitchen display (`/kitchen`)

Purpose: large-screen prep queue for back-of-house staff.

Receipt format:
- Order number (e.g. `#1001`)
- Fulfillment type (delivery / takeaway)
- Item list with quantities
- Delivery address or pickup time
- Total amount
- Acknowledge button to move order to `in_kitchen`

Bell behavior:
- Plays a triple-tone alert when a new `confirmed` order appears
- Polls every 3 seconds

## Payment verification workflow

1. Customer completes checkout and receives bank account details on WhatsApp.
2. Customer sends payment screenshot image.
3. Order status becomes `payment_uploaded`.
4. Counter staff reviews screenshot in dashboard.
5. Approve → order becomes `confirmed`, customer notified, kitchen display alerted.
6. Reject → order returns to `awaiting_payment`, customer asked to resend proof.

## Menu admin (`/admin/menu`)

- Create or update menu items via `/api/admin/menu`
- Controls item availability and pricing used by the WhatsApp bot
