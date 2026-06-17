export type OrderStatus =
  | "new"
  | "cart_started"
  | "awaiting_address"
  | "awaiting_pickup_time"
  | "awaiting_confirmation"
  | "awaiting_payment"
  | "payment_uploaded"
  | "confirmed"
  | "in_kitchen"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "payment_requested" | "paid" | "rejected";

export type FulfillmentType = "delivery" | "takeaway";

export type ConversationStep =
  | "idle"
  | "browsing_menu"
  | "selecting_items"
  | "selecting_item_options"
  | "choosing_fulfillment"
  | "collecting_address"
  | "collecting_pickup_time"
  | "confirming_order"
  | "awaiting_payment_screenshot";

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type MenuOptionChoice = {
  id: string;
  label: string;
  priceDeltaCents: number;
};

export type MenuOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  choices: MenuOptionChoice[];
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  prepMinutes: number;
  optionGroups: MenuOptionGroup[];
  imageUrl?: string;
};

export type SelectedOption = {
  groupId: string;
  choiceId: string;
  label: string;
  priceDeltaCents: number;
};

export type CartLine = {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineKey: string;
  selectedOptions: SelectedOption[];
  notes?: string;
};

export type CheckoutDraft = {
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  pickupTime?: string;
};

export type PendingItemSelection = {
  menuItemId: string;
  quantity: number;
  groupIndex: number;
  selectedOptions: SelectedOption[];
};

export type ConversationContext = {
  checkoutDraft?: CheckoutDraft;
  pendingItem?: PendingItemSelection;
};

export type Customer = {
  id: string;
  phone: string;
  name?: string;
  defaultAddress?: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  customerPhone: string;
  step: ConversationStep;
  activeCategoryId?: string;
  shownItemIds: string[];
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  orderNumber: number;
  customerPhone: string;
  customerName?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  pickupTime?: string;
  items: CartLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  notes?: string;
  paymentScreenshotUrl?: string;
  paymentVerifiedBy?: string;
  paymentVerifiedAt?: string;
  paymentRejectionReason?: string;
  kitchenAcknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderEvent = {
  id: string;
  orderId: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
};

export type BotMessage = {
  body: string;
  mediaUrl?: string;
};

export type BotResult = {
  messages: BotMessage[];
  orderId?: string;
};
