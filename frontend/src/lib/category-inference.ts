/**
 * Infer category name from product name (e.g. from supplier CSV/Excel).
 * Used when bulk-adding supplier products so each item gets a sensible category.
 * Order: more specific matches first (e.g. "blue band" -> Butter before generic).
 * Keywords expanded from tinywow Grovio CSV product list.
 */
const RULES: { keywords: string[]; category: string }[] = [
  // Butter & spreads
  { keywords: ['blue band', 'blue plus', 'margarine'], category: 'Butter' },
  // Canned fish (sardine, mackerel, tuna; macherrel = typo in CSV)
  { keywords: ['sardine', 'mackerel', 'macherrel', 'tuna'], category: 'Sardine' },
  // Tomato products
  { keywords: ['tomato paste', 'tomato mix', 'tomato powder', 'tasty tom', 'rosa tomato', 'ola tomato'], category: 'Tomato Paste' },
  { keywords: ['tomato'], category: 'Tomato Paste' },
  // Milk & creamer
  { keywords: ['condensed milk', 'evaporated milk', 'peak milk', 'carnation milk', 'nido', 'cowbell', 'popular milk', 'nureen condensed'], category: 'Milk' },
  { keywords: ['non-dairy creamer', 'non diary', 'creamer'], category: 'Creamer' },
  { keywords: ['milk'], category: 'Milk' },
  // Biscuits & cookies
  { keywords: ['biscuit', 'cookie', 'cookies', 'digestive', 'shortbread', 'rich tea', 'perk biscuit'], category: 'Biscuits' },
  // Cereal & porridge
  { keywords: ['corn flake', 'cornflake', 'cerelac', 'tom brown', 'oaty oats', 'custard'], category: 'Cereal' },
  { keywords: ['cereal'], category: 'Cereal' },
  // Pasta & noodles
  { keywords: ['spaghetti', 'spagetti', 'spageti', 'pasta', 'maggi', 'noodle', 'macaroni'], category: 'Pasta' },
  // Rice & grains
  { keywords: ['rice'], category: 'Rice' },
  // Sauces & pastes
  { keywords: ['soy sauce', 'soya sauce', 'dark sauce'], category: 'Soy Sauce' },
  { keywords: ['groundnut paste', 'peanut paste'], category: 'Groundnut Paste' },
  { keywords: ['shito'], category: 'Shito' },
  // Canned meat
  { keywords: ['corned beef', 'canned beef', 'beef pate', 'exeter beef', 'rambo corned', 'obaapa corned', 'ester corned', 'platinum beef'], category: 'Canned Beef' },
  // Baked beans
  { keywords: ['baked beans'], category: 'Baked Beans' },
  // Sugar & sweeteners
  { keywords: ['sugar'], category: 'Sugar' },
  // Mayonnaise
  { keywords: ['mayonnaise', 'mayo'], category: 'Mayonnaise' },
  // Seasoning & spices
  { keywords: ['curry powder', 'pepper', 'cube', 'seasoning', 'spice', 'onga stew', 'onga cube', 'jollof mix', 'stew ', 'spices', 'spicies', 'sankofa pepper', 'sankofa spice', 'remie spice', 'deedew spicies'], category: 'Seasoning' },
  // Oil
  { keywords: ['sunflower', 'soyabean oil', 'groundnut oil'], category: 'Oil' },
  { keywords: ['oil'], category: 'Oil' },
  // Salt
  { keywords: ['salt'], category: 'Salt' },
  // Beverages
  { keywords: ['tea', 'ahmad ', 'earl grey', 'green tea'], category: 'Tea' },
  { keywords: ['coffee', 'nescafe', 'decaf', 'cowbell coffee'], category: 'Coffee' },
  { keywords: ['milo', 'chocolim', 'ovaltine', 'yumvita', 'richoco', 'twisco'], category: 'Malt & Chocolate Drink' },
  // Staples
  { keywords: ['gari'], category: 'Gari' },
  { keywords: ['fufu'], category: 'Fufu' },
  // Toiletries (optional; can leave as General or add)
  { keywords: ['tooth paste', 'toothpaste', 'colgate', 'pepsodent', 'brush'], category: 'Toiletries' }
]

export function inferCategoryFromProductName(productName: string): string {
  if (!productName || typeof productName !== 'string') return 'General'
  const lower = productName.toLowerCase().trim()
  for (const { keywords, category } of RULES) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category
    }
  }
  return 'General'
}
