"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIBundlesService = void 0;
const openai_1 = require("@langchain/openai");
const supabase_1 = require("../config/supabase");
const uuid_1 = require("uuid");
class AIBundlesService {
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        this.model = new openai_1.ChatOpenAI({
            apiKey: apiKey || 'dummy',
            modelName: 'gpt-4o-mini',
            temperature: 0.7, // Higher temp for creative combinations
            maxTokens: 2000,
        });
        this.supabase = (0, supabase_1.createAdminClient)();
    }
    /**
     * Generate product bundles using AI
     */
    async generateBundles(count = 20) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                // Fallback to deterministic generation
                return await this.generateDeterministicBundles(count);
            }
            // Fetch all in-stock products from database
            const { data: products, error: productsError } = await this.supabase
                .from('products')
                .select('*')
                .eq('in_stock', true)
                .order('rating', { ascending: false })
                .limit(100);
            if (productsError || !products || products.length === 0) {
                return {
                    success: false,
                    error: 'No products available',
                };
            }
            // Build product catalog for AI
            const productCatalog = products.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price),
                category: p.category_name,
                subcategory: p.subcategory,
                brand: p.brand,
                rating: p.rating,
            }));
            const prompt = `You are a grocery shopping expert creating curated product bundles for Ghanaian shoppers.

**Available Products:**
${JSON.stringify(productCatalog, null, 2)}

**Task:** Create ${count} diverse product bundles that combine 3-6 products each.

**Bundle Categories to create:**
- Student Essentials (budget-friendly basics)
- Family Dinner Bundle (proteins + vegetables + seasonings)
- Healthy Breakfast Set (nutritious morning items)
- Quick Lunch Combo (fast meal ingredients)
- Vegetarian Delight (plant-based meals)
- Protein Power Pack (high-protein items)
- Baking Essentials (flour, eggs, etc.)
- Weekend BBQ Pack (grilling items)
- Comfort Food Classic (traditional favorites)
- Spice Master Collection (seasonings)

**Requirements:**
1. Each bundle should have 3-6 products
2. Products should complement each other (make sense together)
3. Target a specific audience (students, families, fitness, etc.)
4. Price range variety (budget to premium)
5. Include products from different categories for balance
6. Consider Ghanaian cooking culture

**Output Format (JSON array):**
[{
  "title": "Student Essentials Pack",
  "description": "Perfect starter pack for students living on their own",
  "category": "Student",
  "targetAudience": "university students, young professionals",
  "badge": "Most Popular",
  "productIds": ["product-id-1", "product-id-2", ...],
  "discountPercentage": 15
}]

Return ONLY the JSON array, no additional text.`;
            const response = await this.model.invoke(prompt);
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            // Extract JSON from response
            let bundlesData;
            try {
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                bundlesData = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            }
            catch {
                console.warn('Failed to parse AI response, using deterministic method');
                return await this.generateDeterministicBundles(count);
            }
            // Process and save bundles
            const bundles = [];
            for (const bundleData of bundlesData) {
                const bundle = await this.createBundle(bundleData, products);
                if (bundle) {
                    bundles.push(bundle);
                }
            }
            return {
                success: true,
                bundles,
            };
        }
        catch (error) {
            console.error('Generate bundles error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate bundles',
            };
        }
    }
    /**
     * Generate bundles using deterministic algorithm (fallback)
     */
    async generateDeterministicBundles(count) {
        try {
            const { data: products } = await this.supabase
                .from('products')
                .select('*')
                .eq('in_stock', true)
                .order('rating', { ascending: false });
            if (!products || products.length === 0) {
                return {
                    success: false,
                    error: 'No products available',
                };
            }
            const bundleTemplates = [
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
            ];
            const bundles = [];
            for (const template of bundleTemplates.slice(0, count)) {
                // Get products from specified categories
                const bundleProducts = [];
                let totalPrice = 0;
                for (const category of template.categories) {
                    const categoryProducts = products.filter(p => p.category_name === category &&
                        p.in_stock &&
                        (totalPrice + parseFloat(p.price)) <= template.maxPrice);
                    if (categoryProducts.length > 0) {
                        const selected = categoryProducts[Math.floor(Math.random() * Math.min(2, categoryProducts.length))];
                        bundleProducts.push(selected);
                        totalPrice += parseFloat(selected.price);
                    }
                }
                if (bundleProducts.length >= 2) {
                    const originalPrice = totalPrice;
                    const discountPercentage = 10 + Math.floor(Math.random() * 15); // 10-25% discount
                    const currentPrice = originalPrice * (1 - discountPercentage / 100);
                    const bundle = {
                        id: (0, uuid_1.v4)(),
                        bundleId: `BUNDLE-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
                        title: template.title,
                        description: template.description,
                        category: template.category,
                        targetAudience: template.targetAudience,
                        badge: template.badge,
                        productIds: bundleProducts.map(p => p.id),
                        products: bundleProducts.map(p => ({
                            id: p.id,
                            name: p.name,
                            price: parseFloat(p.price),
                            quantity: 1,
                        })),
                        originalPrice: parseFloat(originalPrice.toFixed(2)),
                        currentPrice: parseFloat(currentPrice.toFixed(2)),
                        savings: parseFloat((originalPrice - currentPrice).toFixed(2)),
                        discountPercentage: parseFloat(discountPercentage.toFixed(2)),
                        rating: 4.5 + Math.random() * 0.4, // 4.5-4.9
                        reviewsCount: Math.floor(Math.random() * 200) + 50,
                        imageUrl: '/grocery.png',
                        createdAt: new Date().toISOString(),
                    };
                    bundles.push(bundle);
                }
            }
            return {
                success: true,
                bundles,
            };
        }
        catch (error) {
            console.error('Deterministic bundles error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate bundles',
            };
        }
    }
    /**
     * Create bundle from AI data
     */
    async createBundle(bundleData, allProducts) {
        try {
            const bundleProducts = allProducts.filter(p => bundleData.productIds.includes(p.id));
            if (bundleProducts.length < 2) {
                return null;
            }
            const originalPrice = bundleProducts.reduce((sum, p) => sum + parseFloat(p.price), 0);
            const discountPercentage = bundleData.discountPercentage || 15;
            const currentPrice = originalPrice * (1 - discountPercentage / 100);
            const bundle = {
                id: (0, uuid_1.v4)(),
                bundleId: `BUNDLE-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
                title: bundleData.title,
                description: bundleData.description,
                category: bundleData.category,
                targetAudience: bundleData.targetAudience,
                badge: bundleData.badge || 'Featured',
                productIds: bundleData.productIds,
                products: bundleProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: parseFloat(p.price),
                    quantity: 1,
                })),
                originalPrice: parseFloat(originalPrice.toFixed(2)),
                currentPrice: parseFloat(currentPrice.toFixed(2)),
                savings: parseFloat((originalPrice - currentPrice).toFixed(2)),
                discountPercentage: parseFloat(discountPercentage.toFixed(2)),
                rating: 4.5 + Math.random() * 0.4,
                reviewsCount: Math.floor(Math.random() * 200) + 50,
                imageUrl: '/grocery.png',
                createdAt: new Date().toISOString(),
            };
            return bundle;
        }
        catch (error) {
            console.error('Create bundle error:', error);
            return null;
        }
    }
    /**
     * Save bundle to database
     */
    async saveBundle(bundle) {
        try {
            const { error } = await this.supabase
                .from('ai_product_bundles')
                .insert({
                bundle_id: bundle.bundleId,
                title: bundle.title,
                description: bundle.description,
                category: bundle.category,
                target_audience: bundle.targetAudience,
                badge: bundle.badge,
                product_ids: bundle.productIds,
                products_snapshot: bundle.products,
                original_price: bundle.originalPrice,
                current_price: bundle.currentPrice,
                savings: bundle.savings,
                discount_percentage: bundle.discountPercentage,
                rating: bundle.rating,
                reviews_count: bundle.reviewsCount,
                image_url: bundle.imageUrl,
                generated_by: 'ai',
                is_active: true,
            });
            if (error) {
                return {
                    success: false,
                    error: error.message,
                };
            }
            return { success: true };
        }
        catch (error) {
            console.error('Save bundle error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save bundle',
            };
        }
    }
    /**
     * Get all active bundles
     */
    async getBundles(options = {}) {
        try {
            let query = this.supabase
                .from('ai_product_bundles')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (options.category) {
                query = query.eq('category', options.category);
            }
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
            }
            const { data: bundles, error } = await query;
            if (error) {
                return {
                    success: false,
                    error: error.message,
                };
            }
            const formattedBundles = bundles?.map(b => ({
                id: b.id,
                bundleId: b.bundle_id,
                title: b.title,
                description: b.description,
                category: b.category,
                targetAudience: b.target_audience,
                badge: b.badge,
                productIds: b.product_ids,
                products: b.products_snapshot,
                originalPrice: parseFloat(b.original_price),
                currentPrice: parseFloat(b.current_price),
                savings: parseFloat(b.savings),
                discountPercentage: parseFloat(b.discount_percentage),
                rating: parseFloat(b.rating),
                reviewsCount: b.reviews_count,
                imageUrl: b.image_url,
                createdAt: b.created_at,
            })) || [];
            return {
                success: true,
                data: formattedBundles,
            };
        }
        catch (error) {
            console.error('Get bundles error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get bundles',
            };
        }
    }
    /**
     * Get bundles personalized for a user
     */
    async getPersonalizedBundles(userId) {
        try {
            // Get user preferences
            const { data: preferences } = await this.supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
            // Get all bundles
            const { data: allBundles } = await this.getBundles();
            if (!allBundles) {
                return {
                    success: false,
                    error: 'No bundles available',
                };
            }
            // Score bundles based on user preferences
            const scoredBundles = allBundles.map(bundle => {
                let score = 0;
                // Match target audience with user role
                if (preferences?.role && bundle.targetAudience.toLowerCase().includes(preferences.role.toLowerCase())) {
                    score += 10;
                }
                // Match dietary restrictions
                if (preferences?.dietary_restrictions) {
                    const hasRestrictedProducts = bundle.products.some(p => {
                        // Check if product category violates restrictions
                        if (preferences.dietary_restrictions.includes('Vegetarian') &&
                            ['Protein', 'Meat & Fish'].includes(p.name.toLowerCase())) {
                            return true;
                        }
                        return false;
                    });
                    if (!hasRestrictedProducts) {
                        score += 5;
                    }
                    else {
                        score -= 20; // Heavy penalty for restriction violations
                    }
                }
                // Match budget range
                if (preferences?.budget_range) {
                    const budgetMatch = this.matchesBudgetRange(bundle.currentPrice, preferences.budget_range);
                    if (budgetMatch)
                        score += 5;
                }
                // Boost popular bundles
                score += (bundle.rating - 4) * 2; // 0-2 points based on rating
                return { bundle, score };
            });
            // Sort by score and return top bundles
            const personalizedBundles = scoredBundles
                .sort((a, b) => b.score - a.score)
                .map(sb => sb.bundle);
            return {
                success: true,
                data: personalizedBundles,
            };
        }
        catch (error) {
            console.error('Get personalized bundles error:', error);
            // Fallback to all bundles
            return await this.getBundles();
        }
    }
    /**
     * Check if bundle price matches user's budget range
     */
    matchesBudgetRange(price, budgetRange) {
        const weekly = price; // Assume bundle is for weekly shopping
        if (budgetRange.includes('Under ₵100') && weekly < 100)
            return true;
        if (budgetRange.includes('₵100-200') && weekly >= 100 && weekly <= 200)
            return true;
        if (budgetRange.includes('₵200-500') && weekly >= 200 && weekly <= 500)
            return true;
        if (budgetRange.includes('₵500+') && weekly >= 500)
            return true;
        return false;
    }
    /**
     * Get bundle by ID
     */
    async getBundleById(bundleId) {
        try {
            const { data: bundle, error } = await this.supabase
                .from('ai_product_bundles')
                .select('*')
                .eq('bundle_id', bundleId)
                .single();
            if (error) {
                return {
                    success: false,
                    error: 'Bundle not found',
                };
            }
            return {
                success: true,
                data: {
                    id: bundle.id,
                    bundleId: bundle.bundle_id,
                    title: bundle.title,
                    description: bundle.description,
                    category: bundle.category,
                    targetAudience: bundle.target_audience,
                    badge: bundle.badge,
                    productIds: bundle.product_ids,
                    products: bundle.products_snapshot,
                    originalPrice: parseFloat(bundle.original_price),
                    currentPrice: parseFloat(bundle.current_price),
                    savings: parseFloat(bundle.savings),
                    discountPercentage: parseFloat(bundle.discount_percentage),
                    rating: parseFloat(bundle.rating),
                    reviewsCount: bundle.reviews_count,
                    imageUrl: bundle.image_url,
                    createdAt: bundle.created_at,
                },
            };
        }
        catch (error) {
            console.error('Get bundle by ID error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get bundle',
            };
        }
    }
    /**
     * Refresh bundles (regenerate with latest products)
     */
    async refreshBundles() {
        try {
            // Deactivate old bundles
            await this.supabase
                .from('ai_product_bundles')
                .update({ is_active: false })
                .eq('generated_by', 'ai');
            // Generate new bundles
            const result = await this.generateBundles(20);
            if (!result.success || !result.bundles) {
                return {
                    success: false,
                    error: result.error || 'Failed to generate bundles',
                };
            }
            // Save to database
            let savedCount = 0;
            for (const bundle of result.bundles) {
                const saveResult = await this.saveBundle(bundle);
                if (saveResult.success) {
                    savedCount++;
                }
            }
            return {
                success: true,
                count: savedCount,
            };
        }
        catch (error) {
            console.error('Refresh bundles error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to refresh bundles',
            };
        }
    }
}
exports.AIBundlesService = AIBundlesService;
