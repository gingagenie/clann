export type Category = 'produce' | 'meat' | 'dairy' | 'bakery' | 'pantry' | 'frozen' | 'drinks' | 'other'

export const CATEGORY_ORDER: Category[] = [
  'produce', 'meat', 'dairy', 'bakery', 'pantry', 'frozen', 'drinks', 'other',
]

export const CATEGORY_LABEL: Record<Category, string> = {
  produce: '🥦 Produce',
  meat:    '🥩 Meat & Seafood',
  dairy:   '🧀 Dairy & Eggs',
  bakery:  '🍞 Bakery',
  pantry:  '🥫 Pantry',
  frozen:  '🧊 Frozen',
  drinks:  '🥤 Drinks',
  other:   '📦 Other',
}

export function categorise(name: string): Category {
  const n = name.toLowerCase().trim()

  // Split into individual words for exact matching (avoids \b edge cases)
  const wordSet = new Set(n.split(/[\s\-,/]+/).filter(Boolean))
  const hasWord = (...words: string[]) => words.some(w => wordSet.has(w))
  // Check for multi-word phrases
  const hasPhrase = (...phrases: string[]) => phrases.some(p => n.includes(p))

  // ── Frozen — check first so "frozen peas" → frozen, not produce
  if (hasWord('frozen')) return 'frozen'

  // ── Drinks
  if (hasWord('beer', 'wine', 'spirits', 'juice', 'soda', 'cola', 'lemonade', 'cordial', 'coffee', 'tea')
    || hasPhrase('soft drink', 'oat milk', 'almond milk', 'soy milk', 'mineral water', 'sparkling water')
    || n === 'water') return 'drinks'

  // ── Meat & seafood
  if (hasWord('chicken', 'beef', 'mince', 'pork', 'lamb', 'turkey', 'duck',
              'bacon', 'ham', 'steak', 'salmon', 'tuna', 'prawns', 'prawn',
              'seafood', 'schnitzel', 'chorizo', 'pancetta', 'salami', 'rashers', 'snags')
    || hasPhrase('sausage', 'fish fillet', 'fish fillets', 'pork belly', 'lamb chop')) return 'meat'

  // ── Dairy & eggs
  if (hasWord('milk', 'cheese', 'butter', 'yoghurt', 'yogurt', 'egg', 'eggs',
              'parmesan', 'mozzarella', 'cheddar', 'feta', 'brie', 'ricotta',
              'mascarpone', 'custard', 'buttermilk')
    || hasPhrase('sour cream', 'cream cheese', 'thickened cream', 'double cream')) return 'dairy'
  // "cream" alone (but not "coconut cream" which is pantry)
  if (hasWord('cream') && !hasPhrase('coconut cream', 'ice cream')) return 'dairy'

  // ── Bakery
  if (hasWord('bread', 'sourdough', 'baguette', 'croissant', 'flatbread', 'pita', 'pitta')
    || hasPhrase('tortilla', 'pastry sheet', 'puff pastry', 'shortcrust', 'mountain bread', 'bread roll')
    || (hasWord('pastry') && !hasPhrase('pastry sauce'))
    || (hasWord('rolls') && !hasPhrase('spring rolls'))
    || (hasWord('roll') && !hasPhrase('spring roll'))
    || hasWord('wraps', 'wrap', 'bun', 'buns', 'muffin', 'muffins')) return 'bakery'
  // Flour tortillas, corn tortillas
  if (hasWord('tortillas', 'tortilla')) return 'bakery'

  // ── Pantry (check before produce to catch "tomato paste", "pasta sauce" etc.)
  if (hasPhrase('pasta sauce', 'tomato paste', 'tomato sauce', 'coconut milk', 'coconut cream',
                'soy sauce', 'oyster sauce', 'fish sauce', 'hoisin sauce', 'curry paste',
                'stock cube', 'chicken stock', 'beef stock', 'vegetable stock')) return 'pantry'
  if (hasWord('pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'rigatoni', 'fusilli',
              'lasagne', 'rice', 'noodles', 'noodle', 'flour', 'sugar', 'oil', 'vinegar',
              'stock', 'broth', 'seasoning', 'breadcrumbs', 'panko', 'taco', 'packet',
              'tinned', 'canned', 'sauce', 'spice', 'cumin', 'paprika', 'oregano',
              'thyme', 'rosemary', 'oats', 'cereal', 'honey', 'jam', 'vegemite',
              'lentils', 'lentil', 'chickpeas', 'chickpea')) return 'pantry'

  // ── Produce
  if (hasPhrase('spring onion', 'spring onions', 'bok choy', 'sweet potato', 'sweet potatoes')) return 'produce'
  if (hasWord('onion', 'onions', 'garlic', 'potato', 'potatoes', 'tomato', 'tomatoes',
              'carrot', 'carrots', 'broccoli', 'broccolini', 'capsicum', 'cucumber',
              'zucchini', 'mushroom', 'mushrooms', 'spinach', 'lettuce', 'avocado',
              'avocados', 'ginger', 'lemon', 'lemons', 'lime', 'limes', 'apple',
              'apples', 'banana', 'bananas', 'orange', 'oranges', 'mango', 'mangoes',
              'pumpkin', 'cauliflower', 'asparagus', 'celery', 'corn', 'chilli',
              'chili', 'parsley', 'coriander', 'basil', 'mint', 'peas', 'beans',
              'leek', 'kale', 'cabbage', 'silverbeet', 'herbs')) return 'produce'

  return 'other'
}
