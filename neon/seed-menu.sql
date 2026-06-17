insert into menu_categories (id, name, sort_order) values
  ('coffee', 'Coffee', 1),
  ('tea', 'Tea', 2),
  ('breakfast', 'Breakfast', 3),
  ('burgers', 'Burgers', 4),
  ('desserts', 'Desserts', 5)
on conflict (id) do nothing;

insert into menu_items (id, category_id, name, description, price_cents, available, prep_minutes, modifiers) values
  ('latte', 'coffee', 'Cafe Latte', 'Espresso with steamed milk', 45000, true, 5, array['Regular','Large','Oat milk','Extra shot']),
  ('cappuccino', 'coffee', 'Cappuccino', 'Espresso with foamed milk', 42000, true, 5, array['Regular','Large','Decaf']),
  ('americano', 'coffee', 'Americano', 'Espresso with hot water', 38000, true, 4, array['Hot','Iced']),
  ('karak', 'tea', 'Karak Chai', 'Strong milk tea', 25000, true, 6, array['Regular','Less sweet','Extra cardamom']),
  ('green-tea', 'tea', 'Green Tea', 'Light and refreshing', 22000, true, 4, array['Hot','Iced']),
  ('omelette', 'breakfast', 'Cheese Omelette', 'Served with toast', 55000, true, 12, array['White bread','Brown bread']),
  ('paratha', 'breakfast', 'Chicken Paratha Roll', 'Stuffed paratha with chicken filling', 48000, true, 15, array['Mild','Spicy']),
  ('classic-burger', 'burgers', 'Classic Beef Burger', 'Beef patty, cheese, lettuce, sauce', 75000, true, 18, array['Single','Double','No onions']),
  ('chicken-burger', 'burgers', 'Crispy Chicken Burger', 'Crispy chicken fillet with mayo', 72000, true, 18, array['Spicy mayo','Extra cheese']),
  ('brownie', 'desserts', 'Chocolate Brownie', 'Warm brownie with chocolate sauce', 35000, true, 3, array['With ice cream']),
  ('cheesecake', 'desserts', 'New York Cheesecake', 'Creamy baked cheesecake slice', 42000, true, 2, array['Berry topping'])
on conflict (id) do nothing;
