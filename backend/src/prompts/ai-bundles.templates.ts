/**
 * Deterministic bundle templates used when AI is unavailable (no OPENAI_API_KEY).
 * Each template defines category filters and max price for building a bundle from catalog products.
 */

export interface DeterministicBundleTemplate {
  title: string
  description: string
  category: string
  targetAudience: string
  badge: string
  categories: string[]
  maxPrice: number
}

export const DETERMINISTIC_BUNDLE_TEMPLATES: DeterministicBundleTemplate[] = [
  {
    title: 'Student Essentials Pack',
    description: 'Perfect starter pack for students - rice, seasonings, and basics',
    category: 'Student',
    targetAudience: 'students',
    badge: 'Most Popular',
    categories: ['Rice & Grains', 'Seasonings & Spices', 'Cooking Oils'],
    maxPrice: 50,
  },
  {
    title: 'Family Dinner Bundle',
    description: 'Everything for a complete family dinner - proteins, vegetables, seasonings',
    category: 'Family',
    targetAudience: 'families',
    badge: 'Best Value',
    categories: ['Protein', 'Vegetables', 'Seasonings & Spices'],
    maxPrice: 80,
  },
  {
    title: 'Healthy Breakfast Set',
    description: 'Start your day right with nutritious breakfast items',
    category: 'Health',
    targetAudience: 'health-conscious',
    badge: 'Healthy Choice',
    categories: ['Dairy & Eggs', 'Breakfast Cereals'],
    maxPrice: 30,
  },
  {
    title: 'Quick Lunch Combo',
    description: 'Fast and easy lunch ingredients for busy weekdays',
    category: 'Quick Meals',
    targetAudience: 'professionals',
    badge: 'Time Saver',
    categories: ['Pasta & Noodles', 'Dairy & Eggs', 'Cooking Oils'],
    maxPrice: 35,
  },
  {
    title: 'Vegetarian Delight',
    description: 'Complete vegetarian meal ingredients',
    category: 'Vegetarian',
    targetAudience: 'vegetarians',
    badge: 'Plant-Based',
    categories: ['Vegetables', 'Rice & Grains', 'Seasonings & Spices'],
    maxPrice: 40,
  },
  {
    title: 'Protein Power Pack',
    description: 'High-protein ingredients for fitness enthusiasts',
    category: 'Fitness',
    targetAudience: 'fitness enthusiasts',
    badge: 'Muscle Builder',
    categories: ['Protein', 'Dairy & Eggs'],
    maxPrice: 60,
  },
]
