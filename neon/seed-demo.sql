-- Demo customers
insert into customers (id, phone, name, default_address, created_at) values
  ('demo-customer-1', 'whatsapp:+923001001001', 'Ali Khan', 'House 12, Main Boulevard, Gulberg III, Lahore', '2026-06-15T10:00:00.000Z'),
  ('demo-customer-2', 'whatsapp:+923001001002', 'Sara Ahmed', null, '2026-06-15T10:05:00.000Z'),
  ('demo-customer-3', 'whatsapp:+923001001003', 'Omar Hassan', 'Flat 4B, DHA Phase 5, Lahore', '2026-06-15T10:10:00.000Z'),
  ('demo-customer-4', 'whatsapp:+923001001004', 'Fatima Noor', null, '2026-06-15T10:15:00.000Z'),
  ('demo-customer-5', 'whatsapp:+923001001005', 'Hassan Raza', 'Shop 8, Model Town Link Road, Lahore', '2026-06-15T09:30:00.000Z')
on conflict (id) do nothing;

-- Demo orders
insert into orders (id, order_number, customer_phone, customer_name, status, payment_status, fulfillment_type, delivery_address, pickup_time, subtotal_cents, delivery_fee_cents, total_cents, payment_screenshot_url, payment_verified_by, payment_verified_at, kitchen_acknowledged_at, created_at, updated_at) values
  ('demo-order-1001', 1001, 'whatsapp:+923001001001', 'Ali Khan', 'payment_uploaded', 'payment_requested', 'delivery', 'House 12, Main Boulevard, Gulberg III, Lahore', null, 125000, 15000, 140000, 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80', null, null, null, '2026-06-15T11:20:00.000Z', '2026-06-15T11:25:00.000Z'),
  ('demo-order-1002', 1002, 'whatsapp:+923001001002', 'Sara Ahmed', 'confirmed', 'paid', 'takeaway', null, '1:30 PM', 138000, 0, 138000, null, 'counter', '2026-06-15T11:35:00.000Z', null, '2026-06-15T11:30:00.000Z', '2026-06-15T11:35:00.000Z'),
  ('demo-order-1003', 1003, 'whatsapp:+923001001003', 'Omar Hassan', 'in_kitchen', 'paid', 'delivery', 'Flat 4B, DHA Phase 5, Lahore', null, 200000, 15000, 215000, null, 'counter', '2026-06-15T11:45:00.000Z', '2026-06-15T11:50:00.000Z', '2026-06-15T11:40:00.000Z', '2026-06-15T11:50:00.000Z'),
  ('demo-order-1004', 1004, 'whatsapp:+923001001004', 'Fatima Noor', 'ready', 'paid', 'takeaway', null, '12:45 PM', 80000, 0, 80000, null, 'counter', '2026-06-15T11:00:00.000Z', '2026-06-15T11:05:00.000Z', '2026-06-15T10:55:00.000Z', '2026-06-15T12:00:00.000Z'),
  ('demo-order-1005', 1005, 'whatsapp:+923001001005', 'Hassan Raza', 'completed', 'paid', 'delivery', 'Shop 8, Model Town Link Road, Lahore', null, 94000, 15000, 109000, null, 'counter', '2026-06-15T09:45:00.000Z', '2026-06-15T09:50:00.000Z', '2026-06-15T09:40:00.000Z', '2026-06-15T10:30:00.000Z')
on conflict (id) do nothing;

insert into order_items (order_id, menu_item_id, name, quantity, unit_price_cents) values
  ('demo-order-1001', 'latte', 'Cafe Latte', 2, 45000),
  ('demo-order-1001', 'brownie', 'Chocolate Brownie', 1, 35000),
  ('demo-order-1002', 'cappuccino', 'Cappuccino', 1, 42000),
  ('demo-order-1002', 'paratha', 'Chicken Paratha Roll', 2, 48000),
  ('demo-order-1003', 'classic-burger', 'Classic Beef Burger', 2, 75000),
  ('demo-order-1003', 'karak', 'Karak Chai', 2, 25000),
  ('demo-order-1004', 'americano', 'Americano', 1, 38000),
  ('demo-order-1004', 'cheesecake', 'New York Cheesecake', 1, 42000),
  ('demo-order-1005', 'chicken-burger', 'Crispy Chicken Burger', 1, 72000),
  ('demo-order-1005', 'green-tea', 'Green Tea', 1, 22000);

insert into order_events (id, order_id, status, note, created_at) values
  ('demo-event-1001-1', 'demo-order-1001', 'awaiting_payment', 'Order created, awaiting payment', '2026-06-15T11:20:00.000Z'),
  ('demo-event-1001-2', 'demo-order-1001', 'payment_uploaded', 'Customer uploaded payment screenshot', '2026-06-15T11:25:00.000Z'),
  ('demo-event-1002-1', 'demo-order-1002', 'awaiting_payment', 'Order created, awaiting payment', '2026-06-15T11:30:00.000Z'),
  ('demo-event-1002-2', 'demo-order-1002', 'confirmed', 'Payment approved by counter', '2026-06-15T11:35:00.000Z'),
  ('demo-event-1003-1', 'demo-order-1003', 'confirmed', 'Payment approved by counter', '2026-06-15T11:45:00.000Z'),
  ('demo-event-1003-2', 'demo-order-1003', 'in_kitchen', 'Kitchen acknowledged order', '2026-06-15T11:50:00.000Z'),
  ('demo-event-1004-1', 'demo-order-1004', 'ready', 'Order ready for pickup', '2026-06-15T12:00:00.000Z'),
  ('demo-event-1005-1', 'demo-order-1005', 'completed', 'Order delivered', '2026-06-15T10:30:00.000Z')
on conflict (id) do nothing;

update order_number_seq set next_order_number = 1006 where id = 1;
