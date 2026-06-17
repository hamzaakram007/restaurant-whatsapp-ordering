export const restaurantConfig = {
  name: "Brew & Bite Cafe",
  tagline: "Coffee, snacks, and comfort food on WhatsApp",
  whatsappSender: process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
  currency: "PKR",
  deliveryFeeCents: 15000,
  payment: {
    accountTitle: "Brew & Bite Cafe",
    bankName: "Example Bank",
    accountNumber: "01234567890123",
    iban: "PK00EXMP0001234567890123",
    instructions:
      "Transfer the exact total and send a screenshot of the payment confirmation here.",
  },
  trackingMessages: {
    confirmed: "Your order is confirmed and heading to the kitchen.",
    in_kitchen: "Our kitchen is preparing your order now.",
    ready: "Your order is ready!",
    out_for_delivery: "Your order is on the way.",
    completed: "Order delivered. Thank you for ordering with us!",
    payment_rejected:
      "We could not verify your payment. Please send a clear screenshot or contact the counter.",
  },
} as const;
