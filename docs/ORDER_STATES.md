# Order State Machine

## Conversation steps (WhatsApp bot)

| Step | Trigger | Next step |
|------|---------|-----------|
| `idle` | greeting / menu | `browsing_menu` |
| `browsing_menu` | category number | `selecting_items` |
| `selecting_items` | item number | stays / cart updates |
| `selecting_items` | checkout | `choosing_fulfillment` |
| `choosing_fulfillment` | 1 delivery | `collecting_address` |
| `choosing_fulfillment` | 2 takeaway | `collecting_pickup_time` |
| `collecting_address` | valid address | `confirming_order` |
| `collecting_pickup_time` | pickup time | `confirming_order` |
| `confirming_order` | yes | `awaiting_payment_screenshot` |
| `awaiting_payment_screenshot` | image upload | `idle` |

## Order statuses

| Status | Meaning |
|--------|---------|
| `awaiting_payment` | Order created, waiting for customer transfer |
| `payment_uploaded` | Screenshot received, waiting for staff review |
| `confirmed` | Payment approved, ready for kitchen |
| `in_kitchen` | Kitchen acknowledged and preparing |
| `ready` | Ready for pickup or dispatch |
| `out_for_delivery` | Rider / delivery in progress |
| `completed` | Order fulfilled |
| `cancelled` | Order cancelled |

## Payment statuses

- `payment_requested` — account details shared
- `paid` — staff approved screenshot
- `rejected` — staff rejected screenshot, customer must resend

## Database entities

- `customers` — WhatsApp phone and profile
- `menu_categories` / `menu_items` — catalog
- `conversations` — bot step state per customer
- `orders` / `order_items` — confirmed commerce records
- `order_events` — audit trail for tracking updates
