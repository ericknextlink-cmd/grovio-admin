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
    /** Fetch first image per product for given IDs; return up to 5 URLs (for shop card/carousel). */
    async getProductImagesForBundle(productIds) {
        if (!productIds.length)
            return [];
        const maxImages = 5;
        const ids = productIds.slice(0, maxImages);
        const { data: rows } = await this.supabase
            .from('products')
            .select('id, images')
            .in('id', ids);
        const order = ids;
        const urlById = new Map();
        for (const row of rows ?? []) {
            const imgs = row.images;
            const first = Array.isArray(imgs) && imgs.length > 0
                ? imgs.find((u) => typeof u === 'string' && (u.startsWith('http') || u.startsWith('/')))
                : null;
            if (first)
                urlById.set(row.id, first);
        }
        const out = [];
        for (const id of order) {
            const u = urlById.get(id);
            if (u)
                out.push(u);
            if (out.length >= maxImages)
                break;
        }
        return out;
    }
    /**
     * Generate product bundles using AI.
     * Optional prompt + budget range: bundles will match the description and have total (sum of items) within [budgetMin, budgetMax] GHS.
     */
    async generateBundles(options = {}) {
        const count = options.count ?? 20;
        const { prompt: customPrompt, budgetMin, budgetMax, productsPerBundle } = options;
        const productsPerBundleCap = productsPerBundle != null
            ? Math.min(20, Math.max(2, Math.floor(productsPerBundle)))
            : null;
        try {
            if (!process.env.OPENAI_API_KEY) {
                return await this.generateDeterministicBundles(count);
            }
            // Fetch as many in-stock products as practical so AI can create bundles from full catalog (~3000+)
            const { data: products, error: productsError } = await this.supabase
                .from('products')
                .select('*')
                .eq('in_stock', true)
                .order('rating', { ascending: false })
                .limit(3500);
            if (productsError || !products || products.length === 0) {
                return {
                    success: false,
                    error: 'No products available',
                };
            }
            const productCatalog = products.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price),
                category: p.category_name,
                subcategory: p.subcategory,
                brand: p.brand,
                rating: p.rating,
            }));
            const budgetConstraint = budgetMin != null && budgetMax != null
                ? `**CRITICAL - Budget:** Each bundle's total (sum of selected product prices) MUST be between ${budgetMin} and ${budgetMax} GHS. Choose productIds so that the sum of their prices falls in this range.`
                : 'Each bundle should have a sensible total price (sum of product prices).';
            const productCountRule = productsPerBundleCap != null
                ? `Each bundle must have exactly ${productsPerBundleCap} products.`
                : 'Each bundle must have between 3 and 20 products (you decide how many).';
            const taskInstruction = customPrompt?.trim()
                ? `**Admin instructions:** ${customPrompt}\n\nCreate ${count} bundles that match the above. ${productCountRule}`
                : `Create ${count} diverse product bundles. ${productCountRule} Consider: Student Essentials, Family Dinner, Healthy Breakfast, Quick Lunch, Vegetarian, Protein Pack, Baking Essentials, Comfort Food, Spice Collection.`;
            const prompt = `You are a grocery shopping expert creating curated product bundles for Ghanaian shoppers.

**Available Products (use ONLY these id and price values):**
${JSON.stringify(productCatalog, null, 2)}

**Task:** ${taskInstruction}

**Requirements:**
1. ${productCountRule} Use ONLY product "id" values from the Available Products list above.
2. Products should complement each other (make sense together).
3. ${budgetConstraint}
4. Include products from different categories for balance.

**Output Format (JSON array only, no other text):**
[{
  "title": "Bundle title",
  "description": "Short description",
  "category": "Category name",
  "targetAudience": "who it's for",
  "badge": "Optional badge",
  "productIds": ["<actual-uuid-from-list>", "<actual-uuid-from-list>", ...],
  "discountPercentage": 0
}]

Note: discountPercentage 0 means bundle price = sum of items. Return ONLY the JSON array.`;
            const response = await this.model.invoke(prompt);
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            // Extract JSON from response
            let bundlesData;
            try {
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch && jsonMatch[0]) {
                    // Validate JSON string length before parsing
                    const jsonStr = jsonMatch[0];
                    if (jsonStr.length > 50000) {
                        throw new Error('JSON response too large');
                    }
                    const parsed = JSON.parse(jsonStr);
                    // Validate parsed object structure - should be an array
                    if (Array.isArray(parsed)) {
                        bundlesData = parsed;
                    }
                    else {
                        throw new Error('Invalid JSON structure - expected array');
                    }
                }
                else {
                    bundlesData = [];
                }
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
            const originalPrice = bundleProducts.reduce((sum, p) => sum + parseFloat(String(p.price)), 0);
            const discountPercentage = Number(bundleData.discountPercentage) || 15;
            const currentPrice = originalPrice * (1 - discountPercentage / 100);
            const bundle = {
                id: (0, uuid_1.v4)(),
                bundleId: `BUNDLE-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
                title: String(bundleData.title ?? ''),
                description: String(bundleData.description ?? ''),
                category: String(bundleData.category ?? ''),
                targetAudience: String(bundleData.targetAudience ?? ''),
                badge: String(bundleData.badge ?? 'Featured'),
                productIds: bundleData.productIds,
                products: bundleProducts.map(p => ({
                    id: p.id,
                    name: String(p.name ?? ''),
                    price: parseFloat(String(p.price)),
                    quantity: 1,
                })),
                originalPrice: parseFloat(originalPrice.toFixed(2)),
                currentPrice: parseFloat(currentPrice.toFixed(2)),
                savings: parseFloat((originalPrice - currentPrice).toFixed(2)),
                discountPercentage,
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
     * Create and save a manual bundle (admin-selected products). Uses products from DB.
     */
    async createManualBundle(input) {
        try {
            if (!input.productIds.length || input.productIds.length < 2) {
                return { success: false, error: 'Select at least 2 products for the bundle.' };
            }
            const { data: products, error } = await this.supabase
                .from('products')
                .select('id, name, price')
                .in('id', input.productIds);
            if (error || !products?.length) {
                return { success: false, error: 'Could not load products. Check that IDs exist in the database.' };
            }
            const productMap = new Map(products.map((p) => [p.id, p]));
            const orderedProducts = input.productIds
                .map(id => productMap.get(id))
                .filter(Boolean);
            if (orderedProducts.length < 2) {
                return { success: false, error: 'At least 2 valid products are required.' };
            }
            const originalPrice = orderedProducts.reduce((sum, p) => sum + p.price, 0);
            const discountPercentage = 0;
            const currentPrice = originalPrice;
            const bundle = {
                id: (0, uuid_1.v4)(),
                bundleId: `BUNDLE-MANUAL-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
                title: input.title.trim(),
                description: input.description.trim(),
                category: input.category.trim() || 'General',
                targetAudience: 'General',
                badge: 'Manual',
                productIds: orderedProducts.map(p => p.id),
                products: orderedProducts.map(p => ({ id: p.id, name: p.name, price: p.price, quantity: 1 })),
                originalPrice: parseFloat(originalPrice.toFixed(2)),
                currentPrice: parseFloat(currentPrice.toFixed(2)),
                savings: 0,
                discountPercentage,
                rating: 0,
                reviewsCount: 0,
                createdAt: new Date().toISOString(),
                generatedBy: 'admin',
            };
            const saveResult = await this.saveBundle(bundle, 'admin');
            if (!saveResult.success) {
                return { success: false, error: saveResult.error };
            }
            return { success: true, data: bundle };
        }
        catch (error) {
            console.error('Create manual bundle error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create manual bundle',
            };
        }
    }
    /**
     * Save bundle to database. Use generatedBy 'ai' for AI-generated, 'admin' for manual.
     */
    async saveBundle(bundle, generatedBy = 'ai') {
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
                generated_by: (bundle.generatedBy ?? generatedBy),
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
     * Get all active bundles with pagination. Supports filter by source (ai | admin).
     */
    async getBundles(options = {}) {
        try {
            const page = Math.max(1, options.page ?? 1);
            const limit = Math.min(100, Math.max(1, options.limit ?? 20));
            const offset = options.offset ?? (page - 1) * limit;
            let countQuery = this.supabase
                .from('ai_product_bundles')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            if (options.category) {
                countQuery = countQuery.eq('category', options.category);
            }
            if (options.source) {
                countQuery = countQuery.eq('generated_by', options.source);
            }
            const { count: total, error: countError } = await countQuery;
            if (countError) {
                return { success: false, error: countError.message };
            }
            let query = this.supabase
                .from('ai_product_bundles')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (options.category) {
                query = query.eq('category', options.category);
            }
            if (options.source) {
                query = query.eq('generated_by', options.source);
            }
            const { data: bundles, error } = await query;
            if (error) {
                return {
                    success: false,
                    error: error.message,
                };
            }
            const formattedBundles = (bundles ?? []).map((b) => ({
                id: String(b.id),
                bundleId: String(b.bundle_id),
                title: String(b.title),
                description: String(b.description ?? ''),
                category: String(b.category ?? ''),
                targetAudience: String(b.target_audience ?? ''),
                badge: String(b.badge ?? ''),
                productIds: b.product_ids ?? [],
                products: b.products_snapshot ?? [],
                originalPrice: parseFloat(String(b.original_price)),
                currentPrice: parseFloat(String(b.current_price)),
                savings: parseFloat(String(b.savings)),
                discountPercentage: parseFloat(String(b.discount_percentage)),
                rating: parseFloat(String(b.rating)),
                reviewsCount: Number(b.reviews_count) || 0,
                imageUrl: b.image_url,
                createdAt: String(b.created_at ?? ''),
                generatedBy: (b.generated_by === 'admin' ? 'admin' : 'ai'),
            }));
            for (const bundle of formattedBundles) {
                bundle.productImages = await this.getProductImagesForBundle(bundle.productIds);
            }
            const totalCount = total ?? 0;
            return {
                success: true,
                data: formattedBundles,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit) || 1,
                },
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
            const row = bundle;
            const generatedBy = row.generated_by === 'admin' ? 'admin' : 'ai';
            const productIds = row.product_ids ?? [];
            const productImages = await this.getProductImagesForBundle(productIds);
            return {
                success: true,
                data: {
                    id: row.id,
                    bundleId: row.bundle_id,
                    title: row.title,
                    description: row.description,
                    category: row.category,
                    targetAudience: row.target_audience ?? '',
                    badge: row.badge ?? 'Manual',
                    productIds,
                    products: row.products_snapshot ?? [],
                    originalPrice: parseFloat(String(row.original_price)),
                    currentPrice: parseFloat(String(row.current_price)),
                    savings: parseFloat(String(row.savings)),
                    discountPercentage: parseFloat(String(row.discount_percentage)),
                    rating: parseFloat(String(row.rating)),
                    reviewsCount: row.reviews_count ?? 0,
                    imageUrl: row.image_url,
                    productImages,
                    createdAt: row.created_at,
                    generatedBy,
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
            const result = await this.generateBundles({ count: 20 });
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
