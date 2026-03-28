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
  const n = name.toLowerCase()

  // Frozen first — "frozen peas" should be frozen, not produce
  if (/\bfrozen\b/.test(n)) return 'frozen'

  // Drinks
  if (/\b(juice|soft drink|soda|cola|lemonade|cordial|beer|wine|spirits?|coffee|tea|oat milk|almond milk|soy milk|mineral water|sparkling water)\b/.test(n)
    || /^water$/.test(n)) return 'drinks'

  // Meat & seafood
  if (/\b(chicken|beef|mince|pork|lamb|sausages?|bacon|ham|turkey|duck|steak|chops?|fillet|prawns?|salmon|tuna|fish|seafood|schnitzel|rissoles?|patties|patty|chorizo|pancetta|salami|rashers|snags|cutlets?)\b/.test(n)) return 'meat'

  // Dairy & eggs
  if (/\b(milk|cheese|butter|cream|yoghurt|yogurt|eggs?|sour cream|feta|parmesan|mozzarella|cheddar|brie|ricotta|mascarpone|custard|buttermilk)\b/.test(n)) return 'dairy'

  // Bakery
  if (/\b(bread|rolls?|buns?|wraps?|tortillas?|pita|loaf|sourdough|baguette|croissants?|muffins?|pastry|flatbread|mountain bread)\b/.test(n)) return 'bakery'

  // Pantry (check before produce to catch "tomato paste", "coconut cream" etc.)
  if (/\b(pasta|rice|noodles?|flour|sugar|oil|vinegar|stock|broth|seasoning|soy sauce|oyster sauce|hoisin|curry paste|curry powder|cumin|paprika|oregano|thyme|rosemary|lentils?|chickpeas?|cereal|oats|honey|jam|vegemite|peanut butter|dried|packet|tinned|canned|pasta sauce|tomato paste|tomato sauce|coconut cream|coconut milk|taco|spice|herb mix|breadcrumbs|panko)\b/.test(n)) return 'pantry'

  // Produce
  if (/\b(apples?|bananas?|oranges?|lemons?|limes?|mangoes?|grapes?|strawberr|blueberr|raspberr|avocados?|tomatoes?|potatoes?|onions?|garlic|carrots?|broccoli|broccolini|lettuce|spinach|kale|zucchini|cucumber|capsicum|mushrooms?|celery|corn|peas?|beans?|cabbage|cauliflower|pumpkin|sweet potato|ginger|coriander|parsley|basil|mint|herbs?|salad|veggies?|vegetables?|fruit|leek|asparagus|bok choy|silverbeet|spring onions?|chilli|chili|fresh)\b/.test(n)) return 'produce'

  return 'other'
}
