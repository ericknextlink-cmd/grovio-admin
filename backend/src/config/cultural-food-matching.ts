/**
 * Cultural Food Matching Configuration
 * Provides knowledge base for culturally appropriate food pairings and meal structures
 * Primarily focused on Ghanaian/West African cuisine with extensibility for other cultures
 */

// ============================================================================
// FOOD CATEGORIES AND CLASSIFICATIONS
// ============================================================================

export type FoodCategory = 
  | 'staples'
  | 'proteins'
  | 'vegetables'
  | 'soups_stews'
  | 'condiments'
  | 'beverages'
  | 'dairy'
  | 'cereals'
  | 'fruits'
  | 'snacks'
  | 'oils_fats'
  | 'spices_seasonings'

export interface FoodItem {
  name: string
  category: FoodCategory
  servingUnit: string // e.g., "grams", "ml", "units", "cups"
  typicalServingSize: number
  caloriesPerServing: number
  isGhanaian: boolean
  isWestAfrican: boolean
  isUniversal: boolean
  commonUses: ('breakfast' | 'lunch' | 'dinner' | 'snack' | 'all')[]
  pairsWith: string[] // names of other food items that pair well
  substitutes: string[] // alternative items if not available
  allergenInfo?: string[]
  dietaryTags: ('vegan' | 'vegetarian' | 'halal' | 'dairy-free' | 'gluten-free')[]
}

// ============================================================================
// TRADITIONAL MEAL STRUCTURES
// ============================================================================

export interface MealStructure {
  name: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'any'
  culture: string
  requiredComponents: {
    category: FoodCategory
    minQuantity: number
    description: string
  }[]
  optionalComponents: {
    category: FoodCategory
    maxQuantity: number
    description: string
  }[]
  servingStyle: string
  typicalOccasions: string[]
}

// ============================================================================
// GHANAIAN MEAL PATTERNS
// ============================================================================

export const ghanaianMealPatterns: MealStructure[] = [
  {
    name: 'Heavy Breakfast (Ghanaian)',
    mealType: 'breakfast',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Koko, Tom Brown, or Bread' },
      { category: 'beverages', minQuantity: 1, description: 'Tea, Milo, or Coffee' }
    ],
    optionalComponents: [
      { category: 'dairy', maxQuantity: 1, description: 'Milk for porridge' },
      { category: 'proteins', maxQuantity: 1, description: 'Eggs or groundnuts' }
    ],
    servingStyle: 'Porridge bowl with bread on side',
    typicalOccasions: ['daily', 'cold mornings', 'quick breakfast']
  },
  {
    name: 'Banku with Pepper/Tilapia',
    mealType: 'lunch',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Banku (fermented corn dough)' },
      { category: 'soups_stews', minQuantity: 1, description: 'Pepper sauce or light soup' },
      { category: 'proteins', minQuantity: 1, description: 'Grilled tilapia, fried fish, or meat' }
    ],
    optionalComponents: [
      { category: 'vegetables', maxQuantity: 1, description: 'Fresh pepper, onions garnish' }
    ],
    servingStyle: 'Banku ball with sauce poured over, fish on side',
    typicalOccasions: ['lunch', 'dinner', 'special occasions', 'hot weather']
  },
  {
    name: 'Fufu with Light Soup',
    mealType: 'dinner',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Fufu (pounded cassava/plantain)' },
      { category: 'soups_stews', minQuantity: 1, description: 'Light soup, groundnut soup, or palm nut soup' },
      { category: 'proteins', minQuantity: 1, description: 'Chicken, goat meat, or fish' }
    ],
    optionalComponents: [
      { category: 'vegetables', maxQuantity: 1, description: 'Kontomire (spinach), ayoyo' }
    ],
    servingStyle: 'Fufu in bowl, soup served separately for dipping',
    typicalOccasions: ['dinner', 'family gatherings', 'weekends']
  },
  {
    name: 'Jollof Rice',
    mealType: 'lunch',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Rice cooked in tomato stew' },
      { category: 'proteins', minQuantity: 1, description: 'Chicken, beef, or fried fish' },
      { category: 'vegetables', minQuantity: 1, description: 'Salad or coleslaw on side' }
    ],
    optionalComponents: [
      { category: 'condiments', maxQuantity: 1, description: 'Shito (pepper sauce)' }
    ],
    servingStyle: 'Rice mound with protein on top, salad on side',
    typicalOccasions: ['parties', 'Sunday lunch', 'celebrations', 'daily meal']
  },
  {
    name: 'Waakye',
    mealType: 'breakfast',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Rice and beans' },
      { category: 'proteins', minQuantity: 1, description: 'Spaghetti, gari, or noodles' }
    ],
    optionalComponents: [
      { category: 'proteins', maxQuantity: 1, description: 'Egg, fish, or meat' },
      { category: 'vegetables', maxQuantity: 1, description: 'Salad, avocado' },
      { category: 'condiments', maxQuantity: 1, description: 'Shito, gari foto' }
    ],
    servingStyle: 'Wrapped in leaves or served in bowl with accompaniments',
    typicalOccasions: ['breakfast', 'brunch', 'street food', 'daily']
  },
  {
    name: 'Ampesi (Boiled Yam/Plantain)',
    mealType: 'dinner',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Boiled yam, plantain, or cocoyam' },
      { category: 'soups_stews', minQuantity: 1, description: 'Palava sauce or kontomire stew' },
      { category: 'proteins', minQuantity: 1, description: 'Egg, fish, or meat in stew' }
    ],
    optionalComponents: [
      { category: 'vegetables', maxQuantity: 1, description: 'Extra kontomire leaves' }
    ],
    servingStyle: 'Staples on plate, stew poured over or on side',
    typicalOccasions: ['dinner', 'light meal', 'evening']
  },
  {
    name: 'Kenkey with Pepper',
    mealType: 'dinner',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Fermented corn (kenkey)' },
      { category: 'soups_stews', minQuantity: 1, description: 'Hot pepper sauce' },
      { category: 'proteins', minQuantity: 1, description: 'Fried fish' }
    ],
    optionalComponents: [
      { category: 'vegetables', maxQuantity: 1, description: 'Raw pepper, onions' }
    ],
    servingStyle: 'Kenkey balls with pepper sauce in separate container',
    typicalOccasions: ['dinner', 'hot weather', 'quick meal', 'street food']
  },
  {
    name: 'Rice Water (Rice Porridge)',
    mealType: 'breakfast',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Rice cooked to porridge consistency' },
      { category: 'dairy', minQuantity: 1, description: 'Milk and sugar' }
    ],
    optionalComponents: [
      { category: 'fruits', maxQuantity: 1, description: 'Banana, peanuts' }
    ],
    servingStyle: 'Bowl of porridge with milk floated on top',
    typicalOccasions: ['breakfast', 'sick days', 'children', 'light meal']
  },
  {
    name: 'Beans and Ripe Plantain (Red Red)',
    mealType: 'lunch',
    culture: 'Ghanaian',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Stewed beans (black-eyed peas)' },
      { category: 'staples', minQuantity: 1, description: 'Fried ripe plantain' },
      { category: 'proteins', minQuantity: 1, description: 'Gari, fried fish, or egg' }
    ],
    optionalComponents: [
      { category: 'condiments', maxQuantity: 1, description: 'Palm oil, onions' }
    ],
    servingStyle: 'Beans and plantain mixed or side by side',
    typicalOccasions: ['lunch', 'vegetarian option', 'protein-rich meal']
  },
  {
    name: 'Tuo Zaafi (TZ)',
    mealType: 'dinner',
    culture: 'Ghanaian (Northern)',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Millet or corn dough ball' },
      { category: 'soups_stews', minQuantity: 1, description: 'Ayoyo soup or dried okra' },
      { category: 'proteins', minQuantity: 1, description: 'Meat or fish' }
    ],
    optionalComponents: [
      { category: 'vegetables', maxQuantity: 1, description: 'Dried okra leaves' }
    ],
    servingStyle: 'Soft TZ with thin soup',
    typicalOccasions: ['dinner', 'Northern Ghana specialty', 'light but filling']
  }
]

// ============================================================================
// UNIVERSAL MEAL PATTERNS (Non-culture specific)
// ============================================================================

export const universalMealPatterns: MealStructure[] = [
  {
    name: 'Basic Breakfast',
    mealType: 'breakfast',
    culture: 'Universal',
    requiredComponents: [
      { category: 'cereals', minQuantity: 1, description: 'Cereal or bread' },
      { category: 'dairy', minQuantity: 1, description: 'Milk or alternative' }
    ],
    optionalComponents: [
      { category: 'fruits', maxQuantity: 1, description: 'Banana, apple' },
      { category: 'proteins', maxQuantity: 1, description: 'Eggs' }
    ],
    servingStyle: 'Simple breakfast plate',
    typicalOccasions: ['daily', 'quick', 'children']
  },
  {
    name: 'Balanced Lunch',
    mealType: 'lunch',
    culture: 'Universal',
    requiredComponents: [
      { category: 'staples', minQuantity: 1, description: 'Rice, pasta, or bread' },
      { category: 'proteins', minQuantity: 1, description: 'Meat, fish, eggs, or legumes' },
      { category: 'vegetables', minQuantity: 1, description: 'Fresh or cooked vegetables' }
    ],
    optionalComponents: [
      { category: 'fruits', maxQuantity: 1, description: 'Fruit for dessert' }
    ],
    servingStyle: 'Plate with portions of each component',
    typicalOccasions: ['daily', 'work lunch', 'school lunch']
  }
]

// ============================================================================
// FOOD PAIRING RULES
// ============================================================================

export interface PairingRule {
  primaryItem: string
  pairsWith: string[]
  incompatibleWith: string[]
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

export const foodPairingRules: PairingRule[] = [
  // Ghanaian Staple Pairings
  {
    primaryItem: 'Banku',
    pairsWith: ['Pepper sauce', 'Grilled tilapia', 'Fried fish', 'Okro stew', 'Hot pepper'],
    incompatibleWith: ['Light soup (traditionally)'],
    reason: 'Banku\'s fermented taste pairs with spicy/savory accompaniments',
    confidence: 'high'
  },
  {
    primaryItem: 'Fufu',
    pairsWith: ['Light soup', 'Groundnut soup', 'Palm nut soup', 'Goat meat', 'Chicken', 'Fish'],
    incompatibleWith: ['Pepper sauce alone', 'Dry foods'],
    reason: 'Fufu requires soup to be complete - it\'s always eaten with soup',
    confidence: 'high'
  },
  {
    primaryItem: 'Jollof rice',
    pairsWith: ['Grilled chicken', 'Fried fish', 'Beef', 'Coleslaw', 'Salad', 'Shito'],
    incompatibleWith: ['Soups', 'Heavy stews'],
    reason: 'Jollof is a one-pot dish; pairs with proteins and light sides',
    confidence: 'high'
  },
  {
    primaryItem: 'Waakye',
    pairsWith: ['Spaghetti', 'Gari', 'Egg', 'Fish', 'Salad', 'Avocado', 'Shito'],
    incompatibleWith: ['Soups', 'Heavy stews'],
    reason: 'Waakye is a complete dish with its own accompaniments',
    confidence: 'high'
  },
  {
    primaryItem: 'Kenkey',
    pairsWith: ['Hot pepper sauce', 'Fried fish', 'Shito', 'Pepper'],
    incompatibleWith: ['Soups', 'Heavy stews', 'Milk'],
    reason: 'Kenkey\'s sour taste needs spicy/sharp accompaniments',
    confidence: 'high'
  },
  {
    primaryItem: 'Ampesi',
    pairsWith: ['Palava sauce', 'Kontomire stew', 'Egg', 'Fish', 'Avocado'],
    incompatibleWith: ['Light soup (traditionally)', 'Groundnut soup'],
    reason: 'Boiled staples need thick vegetable-based stews',
    confidence: 'medium'
  },
  {
    primaryItem: 'Koko',
    pairsWith: ['Bread', 'Koose', 'Bofrot', 'Sugar', 'Milk'],
    incompatibleWith: ['Soups', 'Proteins', 'Vegetables'],
    reason: 'Koko is a porridge - pairs with bread/accra for breakfast',
    confidence: 'high'
  },
  
  // Protein Pairings
  {
    primaryItem: 'Grilled tilapia',
    pairsWith: ['Banku', 'Yam chips', 'Fried plantain', 'Pepper sauce', 'Banku'],
    incompatibleWith: ['Rice (unusual pairing)', 'Fufu'],
    reason: 'Grilled fish is street food style - goes with banku or as snack',
    confidence: 'high'
  },
  {
    primaryItem: 'Chicken',
    pairsWith: ['Jollof rice', 'Fried rice', 'Light soup', 'Grilled with spices'],
    incompatibleWith: ['Banku (less common)', 'Kenkey'],
    reason: 'Chicken is versatile but pairs best with rice dishes or soup',
    confidence: 'medium'
  },
  {
    primaryItem: 'Eggs',
    pairsWith: ['Bread', 'Yam', 'Rice', 'Stews', 'Breakfast', 'Waakye'],
    incompatibleWith: ['Soups (as main protein)'],
    reason: 'Eggs are universal protein - works across all meal types',
    confidence: 'high'
  },
  
  // Cereal Pairings
  {
    primaryItem: 'Cornflakes',
    pairsWith: ['Milk', 'Sugar', 'Banana', 'Breakfast only'],
    incompatibleWith: ['Lunch', 'Dinner', 'Soups', 'Stews'],
    reason: 'Cornflakes are strictly breakfast cereal with milk',
    confidence: 'high'
  },
  {
    primaryItem: 'Milo/Ovaltine',
    pairsWith: ['Bread', 'Koko', 'Breakfast', 'Hot water', 'Milk'],
    incompatibleWith: ['Meals', 'Lunch', 'Dinner'],
    reason: 'Milo is a beverage/malt drink for breakfast or snack',
    confidence: 'high'
  },
  
  // Dairy Pairings
  {
    primaryItem: 'Milk',
    pairsWith: ['Cereals', 'Koko', 'Tea', 'Breakfast', 'Rice water'],
    incompatibleWith: ['Lunch', 'Dinner', 'Savory meals', 'Soups'],
    reason: 'Milk is breakfast/light meal only in Ghanaian context',
    confidence: 'high'
  },
  {
    primaryItem: 'Yoghurt',
    pairsWith: ['Snacks', 'Light breakfast', 'Fruits'],
    incompatibleWith: ['Main meals', 'Soups', 'Stews'],
    reason: 'Yoghurt is snack/beverage, not meal accompaniment',
    confidence: 'medium'
  },
  
  // Universal Pairings
  {
    primaryItem: 'Rice',
    pairsWith: ['Stews', 'Soups', 'Grilled proteins', 'Vegetables', 'Fried rice', 'Jollof'],
    incompatibleWith: ['Heavy cream sauces (uncommon in Ghana)'],
    reason: 'Rice is universal staple - adapts to many preparations',
    confidence: 'high'
  },
  {
    primaryItem: 'Spaghetti',
    pairsWith: ['Stews', 'Meatballs', 'Waakye', 'Light tomato sauce'],
    incompatibleWith: ['Soups', 'Heavy Ghanaian stews'],
    reason: 'Spaghetti in Ghana is often accompaniment (waakye) or simple prep',
    confidence: 'medium'
  }
]

// ============================================================================
// SERVING SIZE GUIDELINES BY FAMILY SIZE
// ============================================================================

export interface ServingGuideline {
  foodItem: string
  servingUnit: string
  baseServing: number // per person
  scalingFactor: {
    '1-2': number
    '3-4': number
    '5-6': number
    '7-8': number
    '9+': number
  }
  notes: string
}

export const servingGuidelines: ServingGuideline[] = [
  {
    foodItem: 'Hollandia Milk 190g',
    servingUnit: 'sachet',
    baseServing: 1,
    scalingFactor: {
      '1-2': 1,      // 1 person = 1, 2 people can share 1
      '3-4': 0.75,   // 3-4 people = 3 sachets (not 4)
      '5-6': 0.7,    // 5-6 people = 4 sachets
      '7-8': 0.625,  // 7-8 people = 5 sachets
      '9+': 0.6      // 9+ = round up from 60%
    },
    notes: '1 per person ideally, but 2 can share. Scale down slightly for larger families to control budget'
  },
  {
    foodItem: 'Cornflakes 300g',
    servingUnit: 'box',
    baseServing: 0.5,
    scalingFactor: {
      '1-2': 1,    // 1 box for 2 people
      '3-4': 0.67, // 2 boxes for 4 people
      '5-6': 0.6,  // 3 boxes for 5-6
      '7-8': 0.57, // 4-5 boxes for 7-8
      '9+': 0.55   // 5+ boxes for 9+
    },
    notes: '300g box serves ~4 people for 2-3 meals. Families of 3+ need minimum 2 boxes'
  },
  {
    foodItem: 'Rice 5kg',
    servingUnit: 'bag',
    baseServing: 0.15,
    scalingFactor: {
      '1-2': 0.2,
      '3-4': 0.25,
      '5-6': 0.3,
      '7-8': 0.35,
      '9+': 0.4
    },
    notes: '5kg bag lasts family of 4 about 1 week. Adjust based on meal frequency'
  },
  {
    foodItem: 'Fufu',
    servingUnit: 'unit/ball',
    baseServing: 1,
    scalingFactor: {
      '1-2': 1,
      '3-4': 1,
      '5-6': 1,
      '7-8': 1,
      '9+': 1
    },
    notes: 'Fufu is per-person portion - 1 ball per adult, 0.5 for children'
  },
  {
    foodItem: 'Banku',
    servingUnit: 'serving',
    baseServing: 1,
    scalingFactor: {
      '1-2': 1,
      '3-4': 1,
      '5-6': 1,
      '7-8': 1,
      '9+': 1
    },
    notes: 'Banku is portioned per person - similar to fufu'
  }
]

// ============================================================================
// CULTURAL CONTEXT HELPERS
// ============================================================================

export function getMealPatternsForCulture(culture: string): MealStructure[] {
  switch (culture.toLowerCase()) {
    case 'ghanaian':
    case 'ghana':
      return ghanaianMealPatterns
    case 'universal':
    case 'general':
      return universalMealPatterns
    default:
      return [...ghanaianMealPatterns, ...universalMealPatterns]
  }
}

export function getPairingsForItem(itemName: string): PairingRule | undefined {
  return foodPairingRules.find(
    rule => rule.primaryItem.toLowerCase() === itemName.toLowerCase()
  )
}

export function getServingGuideline(itemName: string): ServingGuideline | undefined {
  // Fuzzy match - check if item name contains guideline food item
  return servingGuidelines.find(guideline => 
    itemName.toLowerCase().includes(guideline.foodItem.toLowerCase())
  )
}

export function calculateQuantity(
  itemName: string,
  familySize: number,
  budget?: number
): { recommended: number; explanation: string } {
  const guideline = getServingGuideline(itemName)
  
  // Budget-aware quantity adjustment - lower budget = more conservative quantities
  const budgetFactor = budget && budget < 100 ? 0.8 : budget && budget > 500 ? 1.2 : 1.0
  
  if (!guideline) {
    const baseQty = Math.ceil(familySize * 0.5 * budgetFactor)
    return { 
      recommended: baseQty, 
      explanation: `Default: ${familySize} people × 0.5 units${budgetFactor !== 1.0 ? ` × ${budgetFactor.toFixed(1)} budget factor` : ''}` 
    }
  }
  
  let scaleKey: keyof typeof guideline.scalingFactor
  if (familySize <= 2) scaleKey = '1-2'
  else if (familySize <= 4) scaleKey = '3-4'
  else if (familySize <= 6) scaleKey = '5-6'
  else if (familySize <= 8) scaleKey = '7-8'
  else scaleKey = '9+'
  
  const rawQuantity = familySize * guideline.baseServing * guideline.scalingFactor[scaleKey]
  const recommended = Math.max(1, Math.ceil(rawQuantity))
  
  return {
    recommended,
    explanation: `${familySize} people × ${guideline.baseServing} ${guideline.servingUnit} × ${guideline.scalingFactor[scaleKey]} scaling = ${recommended} ${guideline.servingUnit}(s). ${guideline.notes}`
  }
}

// ============================================================================
// MEAL COMPLETENESS CHECKER
// ============================================================================

export interface MealValidationResult {
  isComplete: boolean
  missingComponents: string[]
  warnings: string[]
  suggestions: string[]
}

export function validateGhanaianMeal(
  items: string[],
  mealType: 'breakfast' | 'lunch' | 'dinner'
): MealValidationResult {
  const result: MealValidationResult = {
    isComplete: true,
    missingComponents: [],
    warnings: [],
    suggestions: []
  }
  
  // Check for meal appropriateness
  const hasStaple = items.some(item => 
    ['rice', 'fufu', 'banku', 'yam', 'plantain', 'kenkey', 'bread', 'porridge', 'koko']
      .some(staple => item.toLowerCase().includes(staple))
  )
  
  const hasProtein = items.some(item =>
    ['fish', 'chicken', 'meat', 'egg', 'beans', 'nuts', 'groundnut']
      .some(protein => item.toLowerCase().includes(protein))
  )
  
  const hasSpreadAsMain = items.some(item =>
    ['margarine', 'blue band', 'butter', 'spread']
      .some(spread => item.toLowerCase().includes(spread))
  ) && items.length < 3 // If only 1-2 items and one is a spread
  
  // Warnings
  if (hasSpreadAsMain) {
    result.warnings.push('SPREAD AS MAIN MEAL: Margarine/spreads are not appropriate as main food items')
    result.isComplete = false
  }
  
  if (!hasStaple) {
    result.missingComponents.push('Staple food (rice, fufu, banku, yam, bread)')
    result.isComplete = false
  }
  
  if (!hasProtein && mealType !== 'breakfast') {
    result.missingComponents.push('Protein source (fish, meat, eggs, beans)')
    result.warnings.push('Lunch/Dinner should include protein for balanced meal')
  }
  
  // Suggestions
  if (mealType === 'lunch' && !items.some(item => item.toLowerCase().includes('vegetable'))) {
    result.suggestions.push('Consider adding vegetables or salad for balanced lunch')
  }
  
  if (mealType === 'dinner' && items.some(item => item.toLowerCase().includes('milk'))) {
    result.warnings.push('Milk is unusual for dinner - typically a breakfast item')
  }
  
  return result
}

// ============================================================================
// EXPORTS
// ============================================================================

export const CULTURAL_FOOD_KNOWLEDGE = {
  ghanaianMealPatterns,
  universalMealPatterns,
  foodPairingRules,
  servingGuidelines,
  getMealPatternsForCulture,
  getPairingsForItem,
  getServingGuideline,
  calculateQuantity,
  validateGhanaianMeal
}

export default CULTURAL_FOOD_KNOWLEDGE
