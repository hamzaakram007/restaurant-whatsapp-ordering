import { restaurantConfig } from "@/data/restaurant-config";
import type { CartLine, Customer, Order, OrderEvent } from "@/lib/types";

function demoLine(
  menuItemId: string,
  name: string,
  quantity: number,
  unitPriceCents: number,
  selectedOptions: CartLine["selectedOptions"] = [],
): CartLine {
  const choiceIds = selectedOptions.map((option) => option.choiceId).sort().join(":");
  return {
    menuItemId,
    name,
    quantity,
    unitPriceCents,
    selectedOptions,
    lineKey: choiceIds ? `${menuItemId}:${choiceIds}` : menuItemId,
  };
}

export const DEMO_PAYMENT_SCREENSHOT_URL =
  "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80";

export const demoCustomers: Customer[] = [
  {
    id: "demo-customer-1",
    phone: "whatsapp:+923001001001",
    name: "Ali Khan",
    defaultAddress: "House 12, Main Boulevard, Gulberg III, Lahore",
    createdAt: "2026-06-15T10:00:00.000Z",
  },
  {
    id: "demo-customer-2",
    phone: "whatsapp:+923001001002",
    name: "Sara Ahmed",
    createdAt: "2026-06-15T10:05:00.000Z",
  },
  {
    id: "demo-customer-3",
    phone: "whatsapp:+923001001003",
    name: "Omar Hassan",
    defaultAddress: "Flat 4B, DHA Phase 5, Lahore",
    createdAt: "2026-06-15T10:10:00.000Z",
  },
  {
    id: "demo-customer-4",
    phone: "whatsapp:+923001001004",
    name: "Fatima Noor",
    createdAt: "2026-06-15T10:15:00.000Z",
  },
  {
    id: "demo-customer-5",
    phone: "whatsapp:+923001001005",
    name: "Hassan Raza",
    defaultAddress: "Shop 8, Model Town Link Road, Lahore",
    createdAt: "2026-06-15T09:30:00.000Z",
  },
];

export const demoOrders: Order[] = [
  {
    id: "demo-order-1001",
    orderNumber: 1001,
    customerPhone: "whatsapp:+923001001001",
    customerName: "Ali Khan",
    status: "payment_uploaded",
    paymentStatus: "payment_requested",
    fulfillmentType: "delivery",
    deliveryAddress: "House 12, Main Boulevard, Gulberg III, Lahore",
    items: [
      demoLine("latte", "Cafe Latte (Medium)", 2, 48000, [
        { groupId: "size", choiceId: "medium", label: "Medium", priceDeltaCents: 3000 },
      ]),
      demoLine("brownie", "Chocolate Brownie", 1, 35000),
    ],
    subtotalCents: 131000,
    deliveryFeeCents: restaurantConfig.deliveryFeeCents,
    totalCents: 131000 + restaurantConfig.deliveryFeeCents,
    paymentScreenshotUrl: DEMO_PAYMENT_SCREENSHOT_URL,
    createdAt: "2026-06-15T11:20:00.000Z",
    updatedAt: "2026-06-15T11:25:00.000Z",
  },
  {
    id: "demo-order-1002",
    orderNumber: 1002,
    customerPhone: "whatsapp:+923001001002",
    customerName: "Sara Ahmed",
    status: "confirmed",
    paymentStatus: "paid",
    fulfillmentType: "takeaway",
    pickupTime: "1:30 PM",
    items: [
      demoLine("cappuccino", "Cappuccino (Large)", 1, 48000, [
        { groupId: "size", choiceId: "large", label: "Large", priceDeltaCents: 6000 },
      ]),
      demoLine("paratha", "Chicken Paratha Roll (Mild)", 2, 48000, [
        { groupId: "spice", choiceId: "mild", label: "Mild", priceDeltaCents: 0 },
      ]),
    ],
    subtotalCents: 144000,
    deliveryFeeCents: 0,
    totalCents: 144000,
    paymentVerifiedBy: "counter",
    paymentVerifiedAt: "2026-06-15T11:35:00.000Z",
    createdAt: "2026-06-15T11:30:00.000Z",
    updatedAt: "2026-06-15T11:35:00.000Z",
  },
  {
    id: "demo-order-1003",
    orderNumber: 1003,
    customerPhone: "whatsapp:+923001001003",
    customerName: "Omar Hassan",
    status: "in_kitchen",
    paymentStatus: "paid",
    fulfillmentType: "delivery",
    deliveryAddress: "Flat 4B, DHA Phase 5, Lahore",
    items: [
      demoLine("classic-burger", "Classic Beef Burger (Double patty)", 2, 90000, [
        { groupId: "size", choiceId: "double", label: "Double patty", priceDeltaCents: 15000 },
      ]),
      demoLine("karak", "Karak Chai (Large)", 2, 30000, [
        { groupId: "size", choiceId: "large", label: "Large", priceDeltaCents: 5000 },
      ]),
    ],
    subtotalCents: 240000,
    deliveryFeeCents: restaurantConfig.deliveryFeeCents,
    totalCents: 240000 + restaurantConfig.deliveryFeeCents,
    paymentVerifiedBy: "counter",
    paymentVerifiedAt: "2026-06-15T11:45:00.000Z",
    kitchenAcknowledgedAt: "2026-06-15T11:50:00.000Z",
    createdAt: "2026-06-15T11:40:00.000Z",
    updatedAt: "2026-06-15T11:50:00.000Z",
  },
  {
    id: "demo-order-1004",
    orderNumber: 1004,
    customerPhone: "whatsapp:+923001001004",
    customerName: "Fatima Noor",
    status: "ready",
    paymentStatus: "paid",
    fulfillmentType: "takeaway",
    pickupTime: "12:45 PM",
    items: [
      demoLine("americano", "Americano (Iced, Medium)", 1, 43000, [
        { groupId: "temperature", choiceId: "iced", label: "Iced", priceDeltaCents: 3000 },
        { groupId: "size", choiceId: "medium", label: "Medium", priceDeltaCents: 2000 },
      ]),
      demoLine("cheesecake", "New York Cheesecake", 1, 42000),
    ],
    subtotalCents: 85000,
    deliveryFeeCents: 0,
    totalCents: 85000,
    paymentVerifiedBy: "counter",
    paymentVerifiedAt: "2026-06-15T11:00:00.000Z",
    kitchenAcknowledgedAt: "2026-06-15T11:05:00.000Z",
    createdAt: "2026-06-15T10:55:00.000Z",
    updatedAt: "2026-06-15T12:00:00.000Z",
  },
  {
    id: "demo-order-1005",
    orderNumber: 1005,
    customerPhone: "whatsapp:+923001001005",
    customerName: "Hassan Raza",
    status: "completed",
    paymentStatus: "paid",
    fulfillmentType: "delivery",
    deliveryAddress: "Shop 8, Model Town Link Road, Lahore",
    items: [
      demoLine("chicken-burger", "Crispy Chicken Burger (Single)", 1, 72000, [
        { groupId: "size", choiceId: "single", label: "Single", priceDeltaCents: 0 },
      ]),
      demoLine("green-tea", "Green Tea (Hot)", 1, 22000, [
        { groupId: "temperature", choiceId: "hot", label: "Hot", priceDeltaCents: 0 },
      ]),
    ],
    subtotalCents: 94000,
    deliveryFeeCents: restaurantConfig.deliveryFeeCents,
    totalCents: 94000 + restaurantConfig.deliveryFeeCents,
    paymentVerifiedBy: "counter",
    paymentVerifiedAt: "2026-06-15T09:45:00.000Z",
    kitchenAcknowledgedAt: "2026-06-15T09:50:00.000Z",
    createdAt: "2026-06-15T09:40:00.000Z",
    updatedAt: "2026-06-15T10:30:00.000Z",
  },
];

export const demoOrderEvents: OrderEvent[] = [
  {
    id: "demo-event-1001-1",
    orderId: "demo-order-1001",
    status: "awaiting_payment",
    note: "Order created, awaiting payment",
    createdAt: "2026-06-15T11:20:00.000Z",
  },
  {
    id: "demo-event-1001-2",
    orderId: "demo-order-1001",
    status: "payment_uploaded",
    note: "Customer uploaded payment screenshot",
    createdAt: "2026-06-15T11:25:00.000Z",
  },
  {
    id: "demo-event-1002-1",
    orderId: "demo-order-1002",
    status: "awaiting_payment",
    note: "Order created, awaiting payment",
    createdAt: "2026-06-15T11:30:00.000Z",
  },
  {
    id: "demo-event-1002-2",
    orderId: "demo-order-1002",
    status: "confirmed",
    note: "Payment approved by counter",
    createdAt: "2026-06-15T11:35:00.000Z",
  },
  {
    id: "demo-event-1003-1",
    orderId: "demo-order-1003",
    status: "confirmed",
    note: "Payment approved by counter",
    createdAt: "2026-06-15T11:45:00.000Z",
  },
  {
    id: "demo-event-1003-2",
    orderId: "demo-order-1003",
    status: "in_kitchen",
    note: "Kitchen acknowledged order",
    createdAt: "2026-06-15T11:50:00.000Z",
  },
  {
    id: "demo-event-1004-1",
    orderId: "demo-order-1004",
    status: "ready",
    note: "Order ready for pickup",
    createdAt: "2026-06-15T12:00:00.000Z",
  },
  {
    id: "demo-event-1005-1",
    orderId: "demo-order-1005",
    status: "completed",
    note: "Order delivered",
    createdAt: "2026-06-15T10:30:00.000Z",
  },
];

export const DEMO_CHAT_PHONE = "whatsapp:+15550001111";
