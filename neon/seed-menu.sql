insert into menu_categories (id, name, sort_order) values
  ('coffee', 'Coffee', 1),
  ('tea', 'Tea', 2),
  ('breakfast', 'Breakfast', 3),
  ('burgers', 'Burgers', 4),
  ('desserts', 'Desserts', 5)
on conflict (id) do nothing;

insert into menu_items (id, category_id, name, description, price_cents, available, prep_minutes, option_groups) values
  ('latte', 'coffee', 'Cafe Latte', 'Espresso with steamed milk', 45000, true, 5,
    '[{"id":"size","name":"Size","required":true,"choices":[{"id":"small","label":"Small","priceDeltaCents":0},{"id":"medium","label":"Medium","priceDeltaCents":3000},{"id":"large","label":"Large","priceDeltaCents":6000}]},{"id":"milk","name":"Milk","required":false,"choices":[{"id":"regular","label":"Regular milk","priceDeltaCents":0},{"id":"oat","label":"Oat milk","priceDeltaCents":5000}]},{"id":"extras","name":"Extras","required":false,"choices":[{"id":"extra-shot","label":"Extra shot","priceDeltaCents":4000}]}]'::jsonb),
  ('cappuccino', 'coffee', 'Cappuccino', 'Espresso with foamed milk', 42000, true, 5,
    '[{"id":"size","name":"Size","required":true,"choices":[{"id":"small","label":"Small","priceDeltaCents":0},{"id":"medium","label":"Medium","priceDeltaCents":3000},{"id":"large","label":"Large","priceDeltaCents":6000}]},{"id":"style","name":"Style","required":false,"choices":[{"id":"regular","label":"Regular","priceDeltaCents":0},{"id":"decaf","label":"Decaf","priceDeltaCents":2000}]}]'::jsonb),
  ('americano', 'coffee', 'Americano', 'Espresso with hot water', 38000, true, 4,
    '[{"id":"temperature","name":"Temperature","required":true,"choices":[{"id":"hot","label":"Hot","priceDeltaCents":0},{"id":"iced","label":"Iced","priceDeltaCents":3000}]},{"id":"size","name":"Size","required":true,"choices":[{"id":"small","label":"Small","priceDeltaCents":0},{"id":"medium","label":"Medium","priceDeltaCents":2000},{"id":"large","label":"Large","priceDeltaCents":4000}]}]'::jsonb),
  ('karak', 'tea', 'Karak Chai', 'Strong milk tea', 25000, true, 6,
    '[{"id":"size","name":"Size","required":true,"choices":[{"id":"regular","label":"Regular","priceDeltaCents":0},{"id":"large","label":"Large","priceDeltaCents":5000}]},{"id":"sweetness","name":"Sweetness","required":false,"choices":[{"id":"normal","label":"Normal","priceDeltaCents":0},{"id":"less-sweet","label":"Less sweet","priceDeltaCents":0},{"id":"extra-cardamom","label":"Extra cardamom","priceDeltaCents":1000}]}]'::jsonb),
  ('green-tea', 'tea', 'Green Tea', 'Light and refreshing', 22000, true, 4,
    '[{"id":"temperature","name":"Temperature","required":true,"choices":[{"id":"hot","label":"Hot","priceDeltaCents":0},{"id":"iced","label":"Iced","priceDeltaCents":2000}]}]'::jsonb),
  ('omelette', 'breakfast', 'Cheese Omelette', 'Served with toast', 55000, true, 12,
    '[{"id":"bread","name":"Bread","required":true,"choices":[{"id":"white","label":"White bread","priceDeltaCents":0},{"id":"brown","label":"Brown bread","priceDeltaCents":2000}]}]'::jsonb),
  ('paratha', 'breakfast', 'Chicken Paratha Roll', 'Stuffed paratha with chicken filling', 48000, true, 15,
    '[{"id":"spice","name":"Spice level","required":true,"choices":[{"id":"mild","label":"Mild","priceDeltaCents":0},{"id":"spicy","label":"Spicy","priceDeltaCents":0}]}]'::jsonb),
  ('classic-burger', 'burgers', 'Classic Beef Burger', 'Beef patty, cheese, lettuce, sauce', 75000, true, 18,
    '[{"id":"size","name":"Size","required":true,"choices":[{"id":"single","label":"Single patty","priceDeltaCents":0},{"id":"double","label":"Double patty","priceDeltaCents":15000}]},{"id":"extras","name":"Extras","required":false,"choices":[{"id":"no-onions","label":"No onions","priceDeltaCents":0},{"id":"extra-cheese","label":"Extra cheese","priceDeltaCents":3000}]}]'::jsonb),
  ('chicken-burger', 'burgers', 'Crispy Chicken Burger', 'Crispy chicken fillet with mayo', 72000, true, 18,
    '[{"id":"size","name":"Size","required":true,"choices":[{"id":"single","label":"Single","priceDeltaCents":0},{"id":"double","label":"Double","priceDeltaCents":12000}]},{"id":"sauce","name":"Sauce","required":false,"choices":[{"id":"regular-mayo","label":"Regular mayo","priceDeltaCents":0},{"id":"spicy-mayo","label":"Spicy mayo","priceDeltaCents":0},{"id":"extra-cheese","label":"Extra cheese","priceDeltaCents":3000}]}]'::jsonb),
  ('brownie', 'desserts', 'Chocolate Brownie', 'Warm brownie with chocolate sauce', 35000, true, 3,
    '[{"id":"extras","name":"Extras","required":false,"choices":[{"id":"ice-cream","label":"With ice cream","priceDeltaCents":8000}]}]'::jsonb),
  ('cheesecake', 'desserts', 'New York Cheesecake', 'Creamy baked cheesecake slice', 42000, true, 2,
    '[{"id":"topping","name":"Topping","required":false,"choices":[{"id":"berry","label":"Berry topping","priceDeltaCents":5000}]}]'::jsonb)
on conflict (id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  available = excluded.available,
  prep_minutes = excluded.prep_minutes,
  option_groups = excluded.option_groups,
  updated_at = now();
