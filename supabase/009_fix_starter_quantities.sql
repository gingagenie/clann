-- ============================================================
-- Clann — Fix starter recipe quantities to Australian metric
-- ============================================================

-- Remove old starters (ingredients cascade)
DELETE FROM recipes WHERE is_starter = true;

-- Re-seed with metric quantities
WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Spaghetti Bolognese', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Spaghetti', '400g', 0), ('Beef mince', '500g', 1), ('Brown onion', '1 large', 2),
  ('Garlic', '3 cloves', 3), ('Crushed tomatoes', '400g tin', 4), ('Tomato paste', '2 tbsp', 5),
  ('Carrot', '1', 6), ('Dried oregano', '1 tsp', 7), ('Parmesan', 'to serve', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Chicken Fajitas', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Chicken breast', '600g', 0), ('Red capsicum', '2', 1), ('Yellow capsicum', '1', 2),
  ('Brown onion', '1', 3), ('Flour tortillas', '8', 4), ('Cumin', '2 tsp', 5),
  ('Smoked paprika', '1 tsp', 6), ('Sour cream', 'to serve', 7), ('Grated cheese', 'to serve', 8),
  ('Lime', '1', 9)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Beef Tacos', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Beef mince', '500g', 0), ('Taco shells', '12', 1), ('Brown onion', '1', 2),
  ('Taco seasoning', '2 tbsp', 3), ('Shredded lettuce', '60g', 4), ('Tomato', '2', 5),
  ('Grated cheese', '100g', 6), ('Sour cream', 'to serve', 7), ('Salsa', 'to serve', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Chicken Stir Fry', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Chicken breast', '600g', 0), ('Mixed stir-fry vegetables', '500g', 1), ('Jasmine rice', '400g', 2),
  ('Soy sauce', '3 tbsp', 3), ('Oyster sauce', '2 tbsp', 4), ('Garlic', '2 cloves', 5),
  ('Fresh ginger', '1 tsp grated', 6), ('Sesame oil', '1 tsp', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Pasta Bake', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Penne pasta', '400g', 0), ('Beef mince', '500g', 1), ('Crushed tomatoes', '400g tin', 2),
  ('Tomato paste', '2 tbsp', 3), ('Brown onion', '1', 4), ('Garlic', '2 cloves', 5),
  ('Thickened cream', '250ml', 6), ('Grated cheese', '150g', 7), ('Dried Italian herbs', '1 tsp', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Butter Chicken', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Chicken thighs', '700g', 0), ('Butter chicken sauce', '400g jar', 1), ('Coconut cream', '270ml', 2),
  ('Jasmine rice', '400g', 3), ('Brown onion', '1', 4), ('Garlic', '2 cloves', 5),
  ('Fresh coriander', 'to serve', 6), ('Naan bread', '4', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Fish and Chips', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('White fish fillets', '600g', 0), ('Potatoes', '1kg', 1), ('Plain flour', '125g', 2),
  ('Eggs', '2', 3), ('Breadcrumbs', '100g', 4), ('Lemon', '1', 5),
  ('Tartare sauce', 'to serve', 6), ('Oil for frying', 'as needed', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, notes, is_starter) VALUES ('Lamb Chops with Roast Veg', 'Season chops generously', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Lamb loin chops', '8', 0), ('Potatoes', '4 medium', 1), ('Carrots', '3', 2),
  ('Zucchini', '2', 3), ('Olive oil', '3 tbsp', 4), ('Fresh rosemary', '2 sprigs', 5),
  ('Garlic', '4 cloves', 6), ('Lemon', '1', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Sausages and Mash', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Pork sausages', '8', 0), ('Potatoes', '1kg', 1), ('Frozen peas', '200g', 2),
  ('Butter', '60g', 3), ('Milk', '125ml', 4), ('Gravy', '1 packet or jar', 5),
  ('Brown onion', '2', 6)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, notes, is_starter) VALUES ('Fried Rice', 'Best with day-old rice', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Cooked jasmine rice', '800g', 0), ('Eggs', '3', 1), ('Frozen peas and corn', '150g', 2),
  ('Bacon or ham', '200g', 3), ('Soy sauce', '3 tbsp', 4), ('Spring onions', '3', 5),
  ('Garlic', '2 cloves', 6), ('Sesame oil', '1 tsp', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Chicken Schnitzel', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Chicken breasts', '4', 0), ('Plain flour', '75g', 1), ('Eggs', '2', 2),
  ('Breadcrumbs', '200g', 3), ('Oil for frying', 'as needed', 4), ('Lemon', '1', 5),
  ('Mixed salad', 'to serve', 6)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Beef Burgers', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Beef mince', '600g', 0), ('Burger buns', '4', 1), ('Cheddar cheese slices', '4', 2),
  ('Lettuce', '1/4 head', 3), ('Tomato', '1', 4), ('Red onion', '1', 5),
  ('Tomato sauce', 'to serve', 6), ('Mustard', 'to serve', 7), ('Mayonnaise', 'to serve', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Pea and Ham Soup', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Dried split peas', '500g', 0), ('Ham hock', '1', 1), ('Brown onion', '2', 2),
  ('Carrots', '2', 3), ('Celery stalks', '2', 4), ('Chicken stock', '1.5L', 5),
  ('Bay leaves', '2', 6), ('Crusty bread', 'to serve', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Roast Chicken', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Whole chicken', '1.8kg', 0), ('Potatoes', '6 medium', 1), ('Carrots', '3', 2),
  ('Brown onion', '2', 3), ('Olive oil', '3 tbsp', 4), ('Lemon', '1', 5),
  ('Fresh rosemary and thyme', 'few sprigs', 6), ('Garlic', '6 cloves', 7), ('Butter', '30g', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Lasagne', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Lasagne sheets', '12', 0), ('Beef mince', '500g', 1), ('Crushed tomatoes', '400g tin', 2),
  ('Tomato paste', '2 tbsp', 3), ('Brown onion', '1', 4), ('Garlic', '2 cloves', 5),
  ('Butter', '60g', 6), ('Plain flour', '60g', 7), ('Milk', '500ml', 8),
  ('Grated cheese', '150g', 9)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Bacon and Egg Quiche', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Shortcrust pastry sheet', '1', 0), ('Eggs', '5', 1), ('Thickened cream', '250ml', 2),
  ('Bacon', '200g', 3), ('Grated cheese', '100g', 4), ('Brown onion', '1', 5),
  ('Fresh chives', 'small bunch', 6), ('Mixed salad', 'to serve', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Nachos', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Corn chips', '200g', 0), ('Beef mince', '500g', 1), ('Red kidney beans', '400g tin', 2),
  ('Grated cheese', '150g', 3), ('Sour cream', 'to serve', 4), ('Guacamole', 'to serve', 5),
  ('Salsa', 'to serve', 6), ('Taco seasoning', '2 tbsp', 7), ('Jalapeños', 'to taste', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Honey Soy Chicken', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Chicken drumsticks', '8', 0), ('Soy sauce', '3 tbsp', 1), ('Honey', '3 tbsp', 2),
  ('Garlic', '3 cloves', 3), ('Sesame oil', '1 tsp', 4), ('Fresh ginger', '1 tsp grated', 5),
  ('Jasmine rice', '400g', 6), ('Steamed broccoli', 'to serve', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Salmon with Veg', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Salmon fillets', '4', 0), ('Broccolini', '2 bunches', 1), ('Asparagus', '1 bunch', 2),
  ('Lemon', '1', 3), ('Olive oil', '2 tbsp', 4), ('Garlic', '2 cloves', 5),
  ('Jasmine rice', '400g', 6), ('Soy sauce', '1 tbsp', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Mac and Cheese', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Macaroni', '400g', 0), ('Grated cheddar', '200g', 1), ('Milk', '500ml', 2),
  ('Butter', '60g', 3), ('Plain flour', '60g', 4), ('Dijon mustard', '1 tsp', 5),
  ('Breadcrumbs', '50g', 6), ('Parmesan', '30g', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Shepherd''s Pie', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Lamb mince', '600g', 0), ('Potatoes', '1kg', 1), ('Carrots', '2', 2),
  ('Brown onion', '1', 3), ('Frozen peas', '150g', 4), ('Beef stock', '400ml', 5),
  ('Tomato paste', '2 tbsp', 6), ('Worcestershire sauce', '1 tbsp', 7),
  ('Butter', '60g', 8), ('Milk', '60ml', 9)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Chicken Risotto', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Chicken thighs', '600g', 0), ('Arborio rice', '400g', 1), ('Chicken stock', '1.2L', 2),
  ('Brown onion', '1', 3), ('Garlic', '2 cloves', 4), ('White wine', '125ml', 5),
  ('Parmesan', '50g', 6), ('Butter', '30g', 7), ('Frozen peas', '150g', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Beef and Vegetable Soup', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Beef chuck', '500g', 0), ('Potatoes', '3', 1), ('Carrots', '2', 2),
  ('Celery stalks', '2', 3), ('Brown onion', '1', 4), ('Crushed tomatoes', '400g tin', 5),
  ('Beef stock', '1L', 6), ('Frozen peas', '150g', 7), ('Crusty bread', 'to serve', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Garlic Butter Prawns', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Green prawns', '500g', 0), ('Linguine', '400g', 1), ('Butter', '80g', 2),
  ('Garlic', '4 cloves', 3), ('Lemon', '1', 4), ('Fresh parsley', 'small bunch', 5),
  ('White wine', '60ml', 6), ('Chilli flakes', 'pinch', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Chicken Caesar Salad', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Chicken breast', '600g', 0), ('Cos lettuce', '2 heads', 1), ('Bacon', '150g', 2),
  ('Croutons', '80g', 3), ('Parmesan', '50g', 4), ('Caesar dressing', '80ml', 5),
  ('Lemon', '1', 6)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Vegetable and Chickpea Curry', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Chickpeas', '2 x 400g tins', 0), ('Coconut milk', '400ml', 1), ('Crushed tomatoes', '400g tin', 2),
  ('Potato', '2 medium', 3), ('Brown onion', '1', 4), ('Curry paste', '3 tbsp', 5),
  ('Garlic', '2 cloves', 6), ('Jasmine rice', '400g', 7), ('Fresh coriander', 'to serve', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Beef Stir Fry with Noodles', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Beef strips', '600g', 0), ('Hokkien noodles', '400g', 1), ('Mixed stir-fry vegetables', '500g', 2),
  ('Oyster sauce', '3 tbsp', 3), ('Soy sauce', '2 tbsp', 4), ('Garlic', '2 cloves', 5),
  ('Fresh ginger', '1 tsp grated', 6), ('Sesame oil', '1 tsp', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Homemade Pizza', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Pizza bases', '2 large', 0), ('Pizza sauce', '200ml', 1), ('Mozzarella', '200g', 2),
  ('Ham', '200g', 3), ('Red capsicum', '1', 4), ('Mushrooms', '150g', 5),
  ('Red onion', '1/2', 6), ('Olives', '50g', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Tuna Pasta', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Penne pasta', '400g', 0), ('Tuna in olive oil', '2 x 185g tins', 1), ('Crushed tomatoes', '400g tin', 2),
  ('Brown onion', '1', 3), ('Garlic', '2 cloves', 4), ('Capers', '2 tbsp', 5),
  ('Fresh parsley', 'small bunch', 6), ('Chilli flakes', 'pinch', 7)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('Teriyaki Salmon', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Salmon fillets', '4', 0), ('Soy sauce', '3 tbsp', 1), ('Mirin', '2 tbsp', 2),
  ('Honey', '1 tbsp', 3), ('Garlic', '2 cloves', 4), ('Jasmine rice', '400g', 5),
  ('Edamame', '150g', 6), ('Spring onions', '2', 7), ('Sesame seeds', '1 tbsp', 8)
) AS v(name, qty, i);

WITH r AS (INSERT INTO recipes (title, is_starter) VALUES ('BBQ Sausage Rolls', true) RETURNING id)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) SELECT r.id, v.name, v.qty, v.i FROM r CROSS JOIN (VALUES
  ('Puff pastry sheets', '3', 0), ('Pork mince', '500g', 1), ('Brown onion', '1', 2),
  ('Garlic', '2 cloves', 3), ('Breadcrumbs', '50g', 4), ('Worcestershire sauce', '1 tbsp', 5),
  ('Egg', '1', 6), ('Tomato sauce', 'to serve', 7)
) AS v(name, qty, i);
