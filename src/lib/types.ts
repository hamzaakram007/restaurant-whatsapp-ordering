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
  | "editing_order"
  | "editing_order_note"
  | "editing_order_confirm_cancel"
  | "choosing_fulfillment"
  | "collecting_address"
  | "collecting_pickup_time"
  | "confirming_order"
  | "awaiting_payment_screenshot"
  | "choosing_branch";

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
  editingOrderId?: string;
  branchId?: string;
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
  branchId?: string;
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

export type RestaurantStatus = "trial" | "active" | "suspended";
export type RestaurantPlan = "trial" | "starter" | "pro";
export type TwilioMode = "platform" | "byo";
export type MemberRole = "owner" | "counter" | "kitchen";

export type RestaurantPaymentConfig = {
  accountTitle: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  instructions: string;
};

export type RestaurantTrackingMessages = {
  confirmed: string;
  in_kitchen: string;
  ready: string;
  out_for_delivery: string;
  completed: string;
  payment_rejected: string;
  order_updated: string;
  order_cancelled: string;
};

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  currency: string;
  deliveryFeeCents: number;
  payment: RestaurantPaymentConfig;
  trackingMessages: RestaurantTrackingMessages;
  status: RestaurantStatus;
  plan: RestaurantPlan;
  twilioMode: TwilioMode;
  twilioAccountSid?: string;
  twilioAuthTokenEncrypted?: string;
  twilioWhatsappFrom?: string;
  centralTwilioWhatsappFrom?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantConfig = {
  name: string;
  tagline: string;
  whatsappSender: string;
  currency: string;
  deliveryFeeCents: number;
  payment: RestaurantPaymentConfig;
  trackingMessages: RestaurantTrackingMessages;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
};

export type RestaurantMember = {
  restaurantId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
};

export type SessionUser = {
  userId: string;
  email: string;
  name?: string;
  restaurantId: string;
  branchId?: string;
  role: MemberRole;
};

export type Branch = {
  id: string;
  restaurantId: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  deliveryFeeCents?: number;
  payment?: RestaurantPaymentConfig;
  twilioWhatsappFrom?: string;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BranchMenuOverride = {
  branchId: string;
  menuItemId: string;
  available?: boolean;
  priceCents?: number;
  name?: string;
  description?: string;
};

export type BranchConfig = RestaurantConfig & {
  branchId: string;
  branchName: string;
  branchSlug: string;
};
