"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIEnhancedService = void 0;
exports._getUserContext = _getUserContext;
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const messages_1 = require("@langchain/core/messages");
const supabase_1 = require("../config/supabase");
const ai_prompts_1 = require("../config/ai-prompts");
const cultural_food_matching_1 = require("../config/cultural-food-matching");
const uuid_1 = require("uuid");
class AIEnhancedService {
    constructor() {
        const openAIKey = process.env.OPENAI_API_KEY;
        const xaiKey = process.env.XAI_API_KEY;
        if (!openAIKey) {
            console.warn('OPENAI_API_KEY not set. AI features will be disabled.');
        }
        // Initialize OpenAI (Primary model - product recommendations)
        this.openAIModel = new openai_1.ChatOpenAI({
            apiKey: openAIKey || 'dummy',
            modelName: 'gpt-4o-mini',
            temperature: 0.3,
            maxTokens: 1500,
        });
        // Initialize xAI/Grok (Secondary model - cultural analysis & web search)
        if (xaiKey) {
            this.xaiModel = new openai_1.ChatOpenAI({
                apiKey: xaiKey,
                modelName: `${process.env.XAI_MODEL_NAME}`,
                temperature: 0.4,
                maxTokens: 1500,
                configuration: {
                    baseURL: 'https://api.x.ai/v1',
                }
            });
            console.log('xAI (Grok) model initialized for cultural analysis');
        }
        else {
            this.xaiModel = null;
            console.warn('XAI_API_KEY not set. Cultural analysis features will use OpenAI only.');
        }
        this.adminSupabase = (0, supabase_1.createAdminClient)();
    }
    sanitizeAssistantResponse(text) {
        return text
            // Handles variants like: "Since your family size is 1, ...",
            // "Since your family size is **1**, ...", etc.
            .replace(/^\s*Since your family size is\s*(?:\*\*)?\s*[\w\d]+\s*(?:\*\*)?\s*,?[^.]*\.\s*/i, '')
            // If model starts with this clause and immediately continues (without period), trim to the first "Here's/Here is".
            .replace(/^\s*Since your family size is[\s\S]{0,180}?(?=(Here(?:'|’)?s|Here is)\b)/i, '')
            // Remove stale budget-conflict opener like "previously you specified ₵3" when model hallucinates history conflicts.
            .replace(/^\s*It seems there was a misunderstanding[^.]*previously[^.]*\.\s*/i, '')
            .replace(/^\s*Since\b/i, 'Based on your request,');
    }
    getUserSupabaseClient(userToken) {
        const client = (0, supabase_1.createClient)();
        if (userToken) {
            client.auth.setSession({
                access_token: userToken,
                refresh_token: '',
            }).catch((err) => {
                console.warn('Failed to set user session in Supabase client:', err.message);
            });
        }
        return client;
    }
    anonymizeUserId(userId) {
        const hash = Buffer.from(userId).toString('base64').substring(0, 10);
        return `anon_${hash}`;
    }
    async getUserContext(userId, userToken) {
        try {
            if (!userToken) {
                return {
                    userId,
                    familySize: 1,
                };
            }
            const userSupabase = this.getUserSupabaseClient(userToken);
            const { data: user } = await userSupabase
                .from('users')
                .select('id, role, preferences')
                .eq('id', userId)
                .single();
            const { data: preferences } = await userSupabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (!user || !preferences) {
                console.warn('RLS blocked user data access, using admin client as fallback (this should be fixed)');
                const { data: adminUser } = await this.adminSupabase
                    .from('users')
                    .select('id, role, preferences')
                    .eq('id', userId)
                    .single();
                const { data: adminPreferences } = await this.adminSupabase
                    .from('user_preferences')
                    .select('*')
                    .eq('user_id', userId)
                    .single();
                return {
                    userId: this.anonymizeUserId(userId),
                    role: adminPreferences?.role || adminUser?.role || 'customer',
                    familySize: adminPreferences?.family_size || 1,
                    preferences: adminPreferences?.preferred_categories || [],
                    dietary_restrictions: adminPreferences?.dietary_restrictions || [],
                    preferred_categories: adminPreferences?.preferred_categories || [],
                };
            }
            return {
                userId: this.anonymizeUserId(userId),
                role: preferences?.role || 'customer',
                familySize: preferences?.family_size || 1,
                preferences: preferences?.preferred_categories || [],
                dietary_restrictions: preferences?.dietary_restrictions || [],
                preferred_categories: preferences?.preferred_categories || [],
            };
        }
        catch (error) {
            console.error('Error getting user context:', error);
            return {
                userId: this.anonymizeUserId(userId),
                familySize: 1,
            };
        }
    }
    extractQueryIntent(message, context) {
        const lowerMessage = message.toLowerCase();
        const keywords = [];
        const categories = [];
        const productTypes = [];
        const extractedBudget = context.budget;
        const familySize = context.familySize;
        const productKeywords = [
            'rice', 'flour', 'oil', 'sugar', 'salt', 'tomato', 'onion', 'garlic',
            'chicken', 'fish', 'meat', 'beef', 'pork', 'milk', 'egg', 'bread',
            'noodle', 'pasta', 'cereal', 'beverage', 'drink', 'water', 'juice',
            'vegetable', 'fruit', 'spice', 'seasoning', 'sauce', 'canned', 'frozen'
        ];
        const categoryMap = {
            'rice': ['Pantry', 'Cooking'],
            'grain': ['Pantry', 'Cooking'],
            'flour': ['Pantry', 'Baking'],
            'oil': ['Pantry', 'Cooking Oils'],
            'cooking oil': ['Pantry', 'Cooking Oils'],
            'protein': ['Protein', 'Meat & Fish'],
            'meat': ['Protein', 'Meat & Fish'],
            'fish': ['Protein', 'Meat & Fish'],
            'chicken': ['Protein', 'Meat & Fish'],
            'vegetable': ['Vegetables', 'Fresh Produce'],
            'fruit': ['Fruits', 'Fresh Produce'],
            'dairy': ['Dairy & Eggs'],
            'milk': ['Dairy & Eggs'],
            'egg': ['Dairy & Eggs'],
            'beverage': ['Beverages'],
            'drink': ['Beverages'],
            'snack': ['Snacks'],
            'cereal': ['Breakfast Cereals'],
        };
        for (const keyword of productKeywords) {
            if (lowerMessage.includes(keyword)) {
                keywords.push(keyword);
                if (categoryMap[keyword]) {
                    categories.push(...categoryMap[keyword]);
                }
            }
        }
        const productMentions = message.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
        productTypes.push(...productMentions.slice(0, 10));
        return {
            keywords: [...new Set(keywords)],
            categories: [...new Set(categories)],
            budget: extractedBudget,
            familySize,
            productTypes: [...new Set(productTypes)],
        };
    }
    async getProductsForRAGWithQuery(context, queryIntent, userToken) {
        try {
            // Anonymous users: use admin client so we always have catalog access (no RLS block). Serves everyone.
            const productsSupabase = !userToken
                ? this.adminSupabase
                : this.getUserSupabaseClient(userToken);
            let query = productsSupabase
                .from('products')
                .select('*');
            // Only filter in_stock when using user client; for admin (anonymous) return all so we can recommend
            if (userToken) {
                query = query.eq('in_stock', true);
            }
            if (queryIntent && (queryIntent.keywords.length > 0 || queryIntent.categories.length > 0 || queryIntent.productTypes.length > 0)) {
                const allSearchTerms = [...queryIntent.keywords, ...queryIntent.productTypes].filter(term => term && term.length > 2);
                if (allSearchTerms.length > 0) {
                    const primaryTerm = allSearchTerms[0];
                    const searchPattern = `%${primaryTerm}%`;
                    query = query.or(`name.ilike.${searchPattern},description.ilike.${searchPattern},brand.ilike.${searchPattern},category_name.ilike.${searchPattern},subcategory.ilike.${searchPattern}`);
                }
                if (queryIntent.categories.length > 0) {
                    query = query.in('category_name', queryIntent.categories);
                }
            }
            else {
                if (context.preferred_categories && context.preferred_categories.length > 0) {
                    query = query.in('category_name', context.preferred_categories);
                }
            }
            if (context.dietary_restrictions) {
                if (context.dietary_restrictions.includes('vegetarian')) {
                    query = query.not('category_name', 'in', '("Protein", "Meat & Fish")');
                }
                if (context.dietary_restrictions.includes('vegan')) {
                    query = query.not('category_name', 'in', '("Protein", "Meat & Fish", "Dairy & Eggs")');
                }
            }
            if (queryIntent?.budget || context.budget) {
                void (queryIntent?.budget ?? context.budget ?? 1000);
            }
            query = query.order('rating', { ascending: false })
                .order('price', { ascending: true });
            const limit = 500;
            const { data: products, error } = await query.limit(limit);
            if (error || !products || products.length === 0) {
                if (error) {
                    console.error('Error fetching products (RLS may have blocked access):', error);
                }
                else {
                    console.warn('Products query returned 0 rows (RLS or in_stock filter). Using admin client.');
                }
                const { data: fallbackProducts } = await this.adminSupabase
                    .from('products')
                    .select('*')
                    .order('rating', { ascending: false })
                    .order('price', { ascending: true })
                    .limit(500);
                const list = fallbackProducts || [];
                if (list.length > 0 && queryIntent && (queryIntent.keywords.length > 1 || (queryIntent.productTypes?.length ?? 0) > 0)) {
                    return this.scoreProductsByRelevance(list, queryIntent);
                }
                return list;
            }
            let rankedProducts = products || [];
            if (queryIntent && (queryIntent.keywords.length > 1 || queryIntent.productTypes.length > 0)) {
                rankedProducts = this.scoreProductsByRelevance(rankedProducts, queryIntent);
            }
            if (rankedProducts.length < 100 && (!queryIntent || queryIntent.keywords.length === 0)) {
                const { data: additionalProducts } = await productsSupabase
                    .from('products')
                    .select('*')
                    .eq('in_stock', true)
                    .order('created_at', { ascending: false })
                    .limit(200);
                if (additionalProducts) {
                    const existingIds = new Set(rankedProducts.map(p => p.id));
                    const newProducts = additionalProducts.filter(p => !existingIds.has(p.id));
                    rankedProducts = [...rankedProducts, ...newProducts];
                }
                else {
                    const { data: adminAdditionalProducts } = await this.adminSupabase
                        .from('products')
                        .select('*')
                        .eq('in_stock', true)
                        .order('created_at', { ascending: false })
                        .limit(200);
                    if (adminAdditionalProducts) {
                        const existingIds = new Set(rankedProducts.map(p => p.id));
                        const newProducts = adminAdditionalProducts.filter(p => !existingIds.has(p.id));
                        rankedProducts = [...rankedProducts, ...newProducts];
                    }
                }
            }
            return rankedProducts;
        }
        catch (error) {
            console.error('Error in getProductsForRAGWithQuery:', error);
            try {
                console.warn('Using admin client fallback for products (RLS may have blocked regular client)');
                const { data: fallbackProducts } = await this.adminSupabase
                    .from('products')
                    .select('*')
                    .order('rating', { ascending: false })
                    .order('price', { ascending: true })
                    .limit(500);
                return fallbackProducts || [];
            }
            catch (fallbackError) {
                console.error('Fallback query also failed:', fallbackError);
                return [];
            }
        }
    }
    scoreProductsByRelevance(products, queryIntent) {
        const allSearchTerms = [...queryIntent.keywords, ...queryIntent.productTypes].map(term => term.toLowerCase());
        return products.map(product => {
            let score = 0;
            const productText = `${product.name} ${product.description || ''} ${product.brand || ''} ${product.category_name} ${product.subcategory || ''}`.toLowerCase();
            allSearchTerms.forEach(term => {
                if (productText.includes(term)) {
                    if (product.name.toLowerCase().includes(term)) {
                        score += 10;
                    }
                    else if (product.brand?.toLowerCase().includes(term)) {
                        score += 8;
                    }
                    else if (product.category_name.toLowerCase().includes(term)) {
                        score += 6;
                    }
                    else if (product.description?.toLowerCase().includes(term)) {
                        score += 4;
                    }
                    else {
                        score += 2;
                    }
                }
            });
            if (queryIntent.categories.length > 0 && queryIntent.categories.includes(product.category_name)) {
                score += 5;
            }
            score += product.rating * 0.5;
            if (queryIntent.budget && product.price <= queryIntent.budget * 0.1) {
                score += 3;
            }
            return { product, score };
        })
            .sort((a, b) => b.score - a.score)
            .map(item => item.product);
    }
    async getProductsForRAG(context, userToken) {
        return this.getProductsForRAGWithQuery(context, undefined, userToken);
    }
    buildProductContext(products, limit = 200) {
        if (!products || products.length === 0) {
            return 'No products available in the database.';
        }
        const productsByCategory = new Map();
        products.forEach(p => {
            const category = p.category_name || 'Uncategorized';
            if (!productsByCategory.has(category)) {
                productsByCategory.set(category, []);
            }
            productsByCategory.get(category).push(p);
        });
        const contextSections = [];
        contextSections.push(`\n=== PRODUCT CATALOG (${products.length} products available) ===\n`);
        contextSections.push('IMPORTANT: You MUST ONLY recommend products from this catalog. Do NOT invent or suggest products that are not listed here.\n');
        let productCount = 0;
        for (const [category, categoryProducts] of productsByCategory.entries()) {
            if (productCount >= limit)
                break;
            const categorySection = [];
            categorySection.push(`\n--- ${category} (${categoryProducts.length} products) ---`);
            for (const p of categoryProducts.slice(0, Math.min(50, limit - productCount))) {
                const inStock = p.in_stock ? '✓' : '✗';
                const stockInfo = p.quantity > 0 ? `Qty:${p.quantity}` : 'Out of stock';
                const rating = p.rating > 0 ? `⭐${p.rating.toFixed(1)}` : 'No rating';
                const brand = p.brand ? `Brand:${p.brand}` : '';
                const description = p.description ? ` | ${p.description.substring(0, 60)}...` : '';
                const productLine = `[${inStock}] ${p.name}${brand ? ` (${brand})` : ''} | ${p.category_name}${p.subcategory ? `/${p.subcategory}` : ''} | ₵${p.price.toFixed(2)} | ${stockInfo} | ${rating}${description}`;
                categorySection.push(productLine);
                productCount++;
            }
            contextSections.push(categorySection.join('\n'));
        }
        contextSections.push(`\n=== END OF CATALOG ===\n`);
        contextSections.push(`Total products shown: ${productCount} of ${products.length} available`);
        contextSections.push(`\nREMINDER: Only recommend products listed above. Use exact product names as shown.`);
        return contextSections.join('\n');
    }
    buildSupplierProductContext(supplierProducts, query, maxProducts = 500) {
        if (!supplierProducts || supplierProducts.length === 0) {
            return 'No supplier products available.';
        }
        let productsToInclude = [...supplierProducts];
        const totalProducts = supplierProducts.length;
        if (query && query.trim()) {
            const queryLower = query.toLowerCase();
            const queryKeywords = queryLower.split(/\s+/).filter(k => k.length > 2);
            if (queryKeywords.length > 0) {
                productsToInclude = supplierProducts
                    .map(p => {
                    const nameLower = p.name.toLowerCase();
                    const codeLower = (p.code || '').toLowerCase();
                    let score = 0;
                    queryKeywords.forEach(keyword => {
                        if (nameLower.includes(keyword))
                            score += 2;
                        if (codeLower.includes(keyword))
                            score += 1;
                    });
                    return { product: p, score };
                })
                    .filter(item => item.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, maxProducts)
                    .map(item => item.product);
            }
        }
        if (productsToInclude.length > maxProducts) {
            productsToInclude = productsToInclude.slice(0, maxProducts);
        }
        const contextSections = [];
        contextSections.push(`\n=== SUPPLIER PRODUCT CATALOG ===\n`);
        contextSections.push(`Showing ${productsToInclude.length} of ${totalProducts} products${query ? ' (filtered by query)' : ''}\n`);
        contextSections.push('IMPORTANT: You MUST ONLY recommend products from this catalog. Do NOT invent products.\n');
        const productsByCategory = new Map();
        productsToInclude.forEach(p => {
            const category = this.inferCategoryFromName(p.name);
            if (!productsByCategory.has(category)) {
                productsByCategory.set(category, []);
            }
            productsByCategory.get(category).push(p);
        });
        for (const [category, categoryProducts] of productsByCategory.entries()) {
            const categorySection = [];
            categorySection.push(`\n${category} (${categoryProducts.length}):`);
            for (const p of categoryProducts) {
                const productLine = `${p.name} | ₵${p.unitPrice.toFixed(2)}`;
                categorySection.push(productLine);
            }
            contextSections.push(categorySection.join('\n'));
        }
        contextSections.push(`\n=== END CATALOG ===`);
        if (productsToInclude.length < totalProducts) {
            contextSections.push(`\nNOTE: Only ${productsToInclude.length} of ${totalProducts} products shown. If user asks for products not listed, mention that more products are available in the full catalog.`);
        }
        return contextSections.join('\n');
    }
    inferCategoryFromName(name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('oil') || lowerName.includes('cooking oil'))
            return 'Oils & Fats';
        if (lowerName.includes('rice'))
            return 'Grains & Rice';
        if (lowerName.includes('sardine') || lowerName.includes('mackerel'))
            return 'Canned Fish';
        if (lowerName.includes('milk'))
            return 'Dairy';
        if (lowerName.includes('spaghetti') || lowerName.includes('pasta'))
            return 'Pasta & Noodles';
        if (lowerName.includes('biscuit'))
            return 'Snacks & Biscuits';
        if (lowerName.includes('pepper'))
            return 'Spices & Seasonings';
        if (lowerName.includes('mayo') || lowerName.includes('mayonnaise'))
            return 'Condiments';
        if (lowerName.includes('cube') || lowerName.includes('stock'))
            return 'Seasonings';
        if (lowerName.includes('sugar'))
            return 'Sweeteners';
        if (lowerName.includes('corn') && lowerName.includes('flake'))
            return 'Breakfast Cereals';
        return 'Other';
    }
    /**
     * Categorize a product based on its name
     */
    categorizeProduct(productName) {
        const lowerName = productName.toLowerCase();
        if (lowerName.includes('milk') || lowerName.includes('dairy'))
            return 'Dairy';
        if (lowerName.includes('rice'))
            return 'Grains & Rice';
        if (lowerName.includes('corn') && lowerName.includes('flake'))
            return 'Breakfast Cereals';
        if (lowerName.includes('sardine') || lowerName.includes('mackerel') || lowerName.includes('fish'))
            return 'Canned Fish';
        if (lowerName.includes('oil') || lowerName.includes('palm'))
            return 'Oils & Fats';
        if (lowerName.includes('spaghetti') || lowerName.includes('pasta'))
            return 'Pasta & Noodles';
        if (lowerName.includes('sugar'))
            return 'Sweeteners';
        if (lowerName.includes('biscuit') || lowerName.includes('cracker'))
            return 'Snacks';
        if (lowerName.includes('seasoning') || lowerName.includes('cube') || lowerName.includes('spice'))
            return 'Seasonings';
        return 'Other';
    }
    /**
     * Extract recommended products from AI response text
     * Parses the numbered list format and matches against available products
     * Returns ALL deliberated products with isInFinalList flag
     */
    extractRecommendedProducts(aiResponse, availableProducts) {
        const allRecommended = [];
        // Extract final list products (numbered items in the main recommendation)
        const finalListPattern = /^(?:\d+[\.\)]?|[\*\-])\s*\*?\*?([^\*\n]+?)\*?\*?\s*(?:-\s*)?[₵$]?(\d+(?:\.\d{2})?)/gim;
        // Extract alternatives (items marked as "Alternative:")
        const alternativePattern = /Alternative:\s*([^\n-]+?)\s*-\s*[₵$]?(\d+(?:\.\d{2})?)/gi;
        // Extract deliberation reasons (text in parentheses or after dashes)
        const reasonPattern = /\(([^)]+)\)|-\s*([^\n]+?)(?=\n|$)/g;
        // Use reasonPattern to extract reasons from AI response
        const extractedReasons = [];
        let reasonMatch;
        while ((reasonMatch = reasonPattern.exec(aiResponse)) !== null) {
            const reason = reasonMatch[1] || reasonMatch[2];
            if (reason && reason.trim().length > 5) {
                extractedReasons.push(reason.trim());
            }
        }
        if (extractedReasons.length > 0) {
            console.log(`Extracted ${extractedReasons.length} deliberation reasons`);
        }
        let match;
        const finalListItems = new Set();
        // Extract final list products
        while ((match = finalListPattern.exec(aiResponse)) !== null) {
            const cleanName = match[1].trim()
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/\[|\]/g, '')
                .trim();
            const matchedProduct = this.findMatchingProduct(cleanName, availableProducts);
            if (matchedProduct && !finalListItems.has(matchedProduct.code)) {
                finalListItems.add(matchedProduct.code);
                // Try to extract reason from nearby text
                const nearbyText = aiResponse.substring(Math.max(0, match.index - 200), Math.min(aiResponse.length, match.index + 200));
                const reasonMatch = nearbyText.match(/\(([^)]+)\)/);
                allRecommended.push({
                    id: matchedProduct.code,
                    name: matchedProduct.name,
                    price: matchedProduct.unitPrice,
                    quantity: 1,
                    isInFinalList: true,
                    deliberationReason: reasonMatch ? reasonMatch[1] : 'Selected for final recommendation',
                    category: this.categorizeProduct(matchedProduct.name)
                });
            }
        }
        // Extract alternatives (products AI considered but didn't pick)
        while ((match = alternativePattern.exec(aiResponse)) !== null) {
            const cleanName = match[1].trim()
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .trim();
            const matchedProduct = this.findMatchingProduct(cleanName, availableProducts);
            if (matchedProduct && !finalListItems.has(matchedProduct.code)) {
                allRecommended.push({
                    id: matchedProduct.code,
                    name: matchedProduct.name,
                    price: matchedProduct.unitPrice,
                    quantity: 1,
                    isInFinalList: false,
                    deliberationReason: 'Alternative option - lower price or different brand',
                    category: this.categorizeProduct(matchedProduct.name)
                });
            }
        }
        // Also scan for any product names from available products that appear in the text
        // This captures products the AI mentioned but didn't formally list
        for (const product of availableProducts) {
            if (!finalListItems.has(product.code)) {
                // Check if product name appears in response
                const productNamePattern = new RegExp(`\\b${product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                if (productNamePattern.test(aiResponse) && allRecommended.length < 50) {
                    // Check if already added
                    const alreadyAdded = allRecommended.some(p => p.id === product.code);
                    if (!alreadyAdded) {
                        allRecommended.push({
                            id: product.code,
                            name: product.name,
                            price: product.unitPrice,
                            quantity: 1,
                            isInFinalList: false,
                            deliberationReason: 'Considered during AI deliberation',
                            category: this.categorizeProduct(product.name)
                        });
                    }
                }
            }
        }
        console.log(`Extracted ${allRecommended.filter(p => p.isInFinalList).length} final products and ${allRecommended.filter(p => !p.isInFinalList).length} alternatives`);
        return allRecommended;
    }
    /**
     * Find a matching product from available products using fuzzy matching
     */
    findMatchingProduct(aiProductName, availableProducts) {
        const aiLower = aiProductName.toLowerCase();
        // First try exact match
        let bestMatch = availableProducts.find(p => p.name.toLowerCase() === aiLower);
        if (bestMatch)
            return bestMatch;
        // Try includes match
        bestMatch = availableProducts.find(p => p.name.toLowerCase().includes(aiLower) ||
            aiLower.includes(p.name.toLowerCase()));
        if (bestMatch)
            return bestMatch;
        // Try word-by-word matching (at least 2 words should match)
        const aiWords = aiLower.split(/\s+/).filter(w => w.length > 2);
        for (const product of availableProducts) {
            const productWords = product.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const matchingWords = aiWords.filter(aiw => productWords.some(pw => pw.includes(aiw) || aiw.includes(pw)));
            if (matchingWords.length >= Math.min(2, aiWords.length)) {
                return product;
            }
        }
        // Last resort: check if any significant word matches
        for (const word of aiWords) {
            const match = availableProducts.find(p => p.name.toLowerCase().includes(word));
            if (match)
                return match;
        }
        return null;
    }
    /**
     * Parse budget and meal type from a single message (e.g. "budget of 500", "breakfast", "500").
     * Used so budget-only or one-word follow-ups can still drive recommendations.
     */
    parseBudgetAndMealFromMessage(message) {
        const out = {};
        const lower = message.toLowerCase().trim();
        const hasBudgetCue = /\b(budget|cedis|ghs|ghana|₵|cedi|suggestion|recommendation)\b/i.test(message) ||
            /budget\s+of|on\s+a\s+budget|within\s+\d+|for\s+(me\s+)?(on\s+)?(a\s+)?(budget\s+of\s+)?\d+/i.test(message);
        const numbers = message.match(/\d+[\.,]?\d*/g);
        if (numbers && numbers.length > 0) {
            const num = parseFloat(numbers[0].replace(',', '.'));
            if (Number.isFinite(num) && num > 0 && (hasBudgetCue || lower.length < 20)) {
                out.budget = Math.round(num);
            }
        }
        if (/\bbreakfast\b/i.test(message))
            out.mealType = 'breakfast';
        else if (/\blunch\b/i.test(message))
            out.mealType = 'lunch';
        else if (/\bdinner\b/i.test(message))
            out.mealType = 'dinner';
        return out;
    }
    /**
     * Merge context from thread history so one-word follow-ups ("breakfast", "500") resolve using prior messages.
     */
    mergeSupplierContext(currentMessage, history, bodyOptions) {
        const parsed = this.parseBudgetAndMealFromMessage(currentMessage);
        const words = currentMessage.trim().split(/\s+/).filter(Boolean);
        const isShortFollowUp = words.length <= 2 && (words.length === 0 || words[0].length < 20);
        let budget = bodyOptions.budget ?? parsed.budget;
        let mealType = bodyOptions.mealType ?? parsed.mealType ?? 'all';
        if (isShortFollowUp && history.length > 0) {
            for (let i = history.length - 1; i >= 0 && i >= history.length - 6; i--) {
                if (history[i].role !== 'user')
                    continue;
                const prev = this.parseBudgetAndMealFromMessage(history[i].content);
                if (budget == null && prev.budget != null)
                    budget = prev.budget;
                if (mealType === 'all' && prev.mealType != null)
                    mealType = prev.mealType;
                if (budget != null && mealType !== 'all')
                    break;
            }
        }
        return {
            familySize: bodyOptions.familySize,
            budget,
            mealType: mealType ?? 'all',
            budgetMode: bodyOptions.budgetMode ?? 'per_meal',
        };
    }
    async chatWithSupplierProducts(message, supplierProducts, _userId = 'admin', options = {}) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                return {
                    success: false,
                    error: 'AI service is not configured. Please set OPENAI_API_KEY.',
                };
            }
            if (!supplierProducts || supplierProducts.length === 0) {
                return {
                    success: false,
                    error: 'No supplier products provided.',
                };
            }
            let maxProducts = 500;
            let attempts = 0;
            const maxAttempts = 3;
            let mergedOptions;
            let threadHistory = [];
            if (options.threadId && _userId) {
                await this.getOrCreateThread(_userId, options.threadId);
                threadHistory = await this.getConversationHistory(options.threadId, _userId);
                mergedOptions = this.mergeSupplierContext(message, threadHistory, options);
            }
            else {
                const parsed = this.parseBudgetAndMealFromMessage(message);
                mergedOptions = {
                    familySize: options.familySize,
                    budget: options.budget ?? parsed.budget,
                    mealType: options.mealType ?? parsed.mealType ?? 'all',
                    budgetMode: options.budgetMode ?? 'per_meal',
                };
            }
            while (attempts < maxAttempts) {
                try {
                    const productContext = this.buildSupplierProductContext(supplierProducts, message, maxProducts);
                    const lowerMessage = message.toLowerCase();
                    const familySize = mergedOptions.familySize;
                    const budget = mergedOptions.budget;
                    const normalizedBudget = typeof budget === 'number' && Number.isFinite(budget) ? budget : 0;
                    const mealType = mergedOptions.mealType;
                    const context = {
                        userId: _userId,
                        familySize,
                        budget,
                    };
                    const queryIntent = {
                        keywords: lowerMessage.split(/\s+/).filter(word => word.length > 2),
                        mealType: mergedOptions.mealType,
                        budgetMode: mergedOptions.budgetMode,
                        familySizeExplicit: familySize != null
                    };
                    // Multi-Agent Step 1: xAI Cultural Analysis (runs in parallel with OpenAI prep)
                    console.log('Starting Multi-Agent Deliberation...');
                    const culturalAnalysis = await this.performCulturalDeliberation(message, productContext, familySize ?? 2, normalizedBudget, mealType);
                    console.log('Cultural Analysis:', culturalAnalysis.mealPatterns.join(', '));
                    if (culturalAnalysis.warnings.length > 0) {
                        console.log('Cultural Warnings:', culturalAnalysis.warnings);
                    }
                    // Multi-Agent Step 2: Build enhanced prompt with cultural context
                    let systemPrompt = (0, ai_prompts_1.buildSupplierRecommendationPrompt)(context, queryIntent, productContext);
                    // Append cultural context from deliberation
                    systemPrompt += `\n\n**CULTURAL CONTEXT ANALYSIS:**\n`;
                    systemPrompt += `- Traditional meal patterns: ${culturalAnalysis.mealPatterns.join(', ') || 'General Ghanaian cuisine'}\n`;
                    if (culturalAnalysis.warnings.length > 0) {
                        systemPrompt += `- Cultural validation warnings: ${culturalAnalysis.warnings.join('; ')}\n`;
                    }
                    systemPrompt += `- Focus on culturally appropriate pairings and authentic meal structures\n`;
                    systemPrompt += `- Avoid inappropriate combinations (e.g., spreads as main meals, milk for dinner)\n`;
                    // Add specific pairing guidance based on meal type
                    if (mealType === 'breakfast') {
                        systemPrompt += `- BREAKFAST ONLY ITEMS: Cereals, milk, bread, porridge (koko), tea, milo\n`;
                        systemPrompt += `- NEVER suggest soups, stews, or heavy proteins for breakfast\n`;
                    }
                    else if (mealType === 'lunch') {
                        systemPrompt += `- LUNCH PRIORITIES: Rice dishes (jollof, waakye), banku with pepper, light proteins\n`;
                        systemPrompt += `- INCLUDE fresh vegetables or salad when possible\n`;
                    }
                    else if (mealType === 'dinner') {
                        systemPrompt += `- DINNER PRIORITIES: Fufu with soup, kenkey with pepper, ampesi with stew\n`;
                        systemPrompt += `- Heavier meals acceptable for evening\n`;
                        systemPrompt += `- NEVER suggest milk or breakfast cereals for dinner\n`;
                    }
                    const systemMessage = new messages_1.SystemMessage(systemPrompt);
                    const humanMessage = new messages_1.HumanMessage(message);
                    let responseText;
                    const historyMessages = threadHistory.slice(-6).map(h => h.role === 'user' ? new messages_1.HumanMessage(h.content) : new messages_1.AIMessage(h.content));
                    if (historyMessages.length > 0) {
                        const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                            ['system', systemPrompt],
                            new prompts_1.MessagesPlaceholder('history'),
                            ['human', '{message}'],
                        ]);
                        const chain = prompt.pipe(this.openAIModel).pipe(new output_parsers_1.StringOutputParser());
                        responseText = await chain.invoke({ message, history: historyMessages });
                    }
                    else {
                        const response = await this.openAIModel.invoke([systemMessage, humanMessage]);
                        responseText = typeof response.content === 'string'
                            ? response.content
                            : JSON.stringify(response.content);
                    }
                    const normalizedResponseText = this.sanitizeAssistantResponse(responseText);
                    // Extract recommended products from AI response for cart functionality
                    const recommendedProducts = this.extractRecommendedProducts(normalizedResponseText, supplierProducts.slice(0, maxProducts));
                    // Second xAI pass: validate list; feedback is for the recommender only (no cultural note to user)
                    let finalMessage = normalizedResponseText;
                    let finalProducts = recommendedProducts;
                    const productNames = recommendedProducts.map((p) => p.name);
                    if (productNames.length > 0) {
                        const familyContext = `family of ${familySize ?? 2}`;
                        const validationNote = await this.performRecommendationValidation(productNames, mealType, familyContext);
                        if (validationNote) {
                            const revised = await this.reviseRecommendationWithFeedback(normalizedResponseText, validationNote, productContext, message);
                            if (revised) {
                                finalMessage = this.sanitizeAssistantResponse(revised);
                                finalProducts = this.extractRecommendedProducts(finalMessage, supplierProducts.slice(0, maxProducts));
                                console.log('Main agent revised list using xAI validation feedback');
                            }
                        }
                    }
                    if (options.threadId && _userId) {
                        try {
                            await this.saveMessageToThread(options.threadId, { role: 'user', content: message, timestamp: new Date() }, _userId);
                            await this.saveMessageToThread(options.threadId, { role: 'assistant', content: finalMessage, timestamp: new Date() }, _userId);
                        }
                        catch (e) {
                            console.error('Error saving supplier-recommendations to thread:', e);
                        }
                    }
                    return {
                        success: true,
                        message: finalMessage,
                        threadId: options.threadId,
                        recommendedProducts: finalProducts,
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (errorMessage.includes('maximum context length') || errorMessage.includes('context length')) {
                        attempts++;
                        maxProducts = Math.floor(maxProducts * 0.6);
                        if (attempts >= maxAttempts) {
                            return {
                                success: false,
                                error: `Product catalog is too large. Please refine your query or reduce the number of products.`,
                            };
                        }
                        continue;
                    }
                    throw error;
                }
            }
            return {
                success: false,
                error: 'Failed to process request after multiple attempts.',
            };
        }
        catch (error) {
            console.error('Supplier product AI chat error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'AI service error',
            };
        }
    }
    async getOrCreateThread(userId, threadId) {
        try {
            if (threadId) {
                const { data: existing } = await this.adminSupabase
                    .from('ai_conversation_threads')
                    .select('thread_id')
                    .eq('thread_id', threadId)
                    .eq('user_id', userId)
                    .single();
                if (existing) {
                    return threadId;
                }
                // Client sent a threadId that does not exist yet (e.g. widget first message): create with that id
                await this.adminSupabase
                    .from('ai_conversation_threads')
                    .insert({
                    thread_id: threadId,
                    user_id: userId,
                    messages: [],
                    context: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                return threadId;
            }
            const newThreadId = (0, uuid_1.v4)();
            await this.adminSupabase
                .from('ai_conversation_threads')
                .insert({
                thread_id: newThreadId,
                user_id: userId,
                messages: [],
                context: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            return newThreadId;
        }
        catch (error) {
            console.error('Error managing thread:', error);
            return (0, uuid_1.v4)();
        }
    }
    /**
     * Smart Product Filter for Large Catalogs (4000+ products)
     * Uses cultural context to filter relevant products before sending to AI
     * Reduces token usage and improves recommendation quality
     */
    smartFilterProducts(allProducts, mealType, budget, familySize) {
        console.log(`Smart filtering ${allProducts.length} products for ${mealType}...`);
        // Define priority keywords based on meal type and culture
        const priorityPatterns = {
            breakfast: [
                'milk', 'cornflakes', 'cereal', 'oats', 'bread', 'egg', 'tea', 'milo', 'sugar',
                'margarine', 'butter', 'jam', 'honey', 'biscuit', 'cracker', 'coffee'
            ],
            lunch: [
                'rice', 'jollof', 'waakye', 'beans', 'plantain', 'sardine', 'mackerel', 'fish',
                'chicken', 'meat', 'stew', 'sauce', 'oil', 'spaghetti', 'pasta', 'salad',
                'vegetable', 'onion', 'tomato', 'pepper', 'spice'
            ],
            dinner: [
                'rice', 'fufu', 'banku', 'kenkey', 'yam', 'plantain', 'cassava', 'soup',
                'stew', 'fish', 'chicken', 'meat', 'goat', 'palm oil', 'groundnut', 'peanut',
                'kontomire', 'spinach', 'vegetable', 'onion', 'tomato', 'pepper'
            ],
            staples: [
                'rice', 'beans', 'oil', 'flour', 'sugar', 'salt', 'spaghetti', 'pasta',
                'plantain', 'yam', 'cassava', 'maize', 'corn'
            ],
            proteins: [
                'sardine', 'mackerel', 'fish', 'chicken', 'meat', 'beef', 'goat', 'egg',
                'beans', 'groundnut', 'peanut', 'soy', 'milk', 'dairy'
            ]
        };
        // Combine patterns based on meal type
        let relevantPatterns = [];
        if (mealType === 'breakfast') {
            relevantPatterns = [...priorityPatterns.breakfast, ...priorityPatterns.staples.slice(0, 5)];
        }
        else if (mealType === 'lunch') {
            relevantPatterns = [...priorityPatterns.lunch, ...priorityPatterns.proteins];
        }
        else if (mealType === 'dinner') {
            relevantPatterns = [...priorityPatterns.dinner, ...priorityPatterns.proteins, ...priorityPatterns.staples];
        }
        else {
            // All meals - include all patterns
            relevantPatterns = [
                ...priorityPatterns.breakfast,
                ...priorityPatterns.lunch,
                ...priorityPatterns.dinner
            ];
        }
        // Score and filter products
        const scoredProducts = allProducts.map(product => {
            const nameLower = product.name.toLowerCase();
            const categoryLower = (product.category || '').toLowerCase();
            let score = 0;
            // Category matching bonus
            if (categoryLower && relevantPatterns.some(p => categoryLower.includes(p))) {
                score += 5;
            }
            // Check for priority pattern matches
            for (const pattern of relevantPatterns) {
                if (nameLower.includes(pattern)) {
                    score += 10;
                    // Extra points for exact matches
                    if (nameLower.includes(' ' + pattern + ' ') || nameLower.startsWith(pattern + ' ')) {
                        score += 5;
                    }
                }
            }
            // Budget-appropriate scoring
            const maxItemBudget = budget / familySize / 3; // Approximate per-item budget
            if (product.unitPrice <= maxItemBudget) {
                score += 5; // Within budget
            }
            else if (product.unitPrice <= maxItemBudget * 1.5) {
                score += 2; // Slightly over but acceptable
            }
            // Prefer in-stock items (if stock info available)
            if (product.unitPrice > 0) {
                score += 1;
            }
            return { ...product, score };
        });
        // Sort by score and take top products
        const sortedProducts = scoredProducts
            .sort((a, b) => b.score - a.score)
            .filter(p => p.score > 0); // Only include relevant products
        // Limit based on budget constraints
        const maxProducts = Math.min(300, sortedProducts.length);
        const filteredProducts = sortedProducts.slice(0, maxProducts);
        console.log(`Filtered to ${filteredProducts.length} relevant products (top scored)`);
        // Return without score field
        return filteredProducts.map(({ score: _score, ...product }) => product);
    }
    /**
     * Get conversation history for a thread
     */
    async getConversationHistory(threadId, _userId) {
        try {
            const { data, error } = await this.adminSupabase
                .from('ai_conversation_threads')
                .select('messages')
                .eq('thread_id', threadId)
                .single();
            if (error || !data) {
                return [];
            }
            return data.messages || [];
        }
        catch (error) {
            console.error('Error getting conversation history:', error);
            return [];
        }
    }
    async saveMessageToThread(threadId, message, userId) {
        try {
            const history = await this.getConversationHistory(threadId, userId);
            history.push(message);
            let query = this.adminSupabase
                .from('ai_conversation_threads')
                .update({
                messages: history,
                updated_at: new Date().toISOString(),
            })
                .eq('thread_id', threadId);
            if (userId) {
                query = query.eq('user_id', userId);
            }
            await query;
        }
        catch (error) {
            console.error('Error saving message:', error);
        }
    }
    /**
     * Multi-Agent Cultural Analysis & Deliberation
     * Uses xAI (Grok) for cultural context analysis and OpenAI for product recommendations
     * Both models correlate to finalize culturally appropriate meal recommendations
     */
    async performCulturalDeliberation(userRequest, productContext, familySize, budget, mealType) {
        const result = {
            culturalContext: '',
            mealPatterns: [],
            validatedProducts: [],
            warnings: []
        };
        // Step 1: xAI Cultural Analysis (if available)
        if (this.xaiModel) {
            try {
                const xaiPrompt = `You are a Ghanaian cuisine and cultural food expert. Analyze this meal request:

**User Request**: "${userRequest}"
**Family Size**: ${familySize}
**Budget**: ₵${budget}
**Meal Type**: ${mealType}

**AVAILABLE PRODUCTS IN OUR CATALOG** (ONLY suggest from these - DO NOT suggest items not listed):
${productContext.slice(0, 4000)}  
[Product list truncated if too long - focus on available items only]

**CRITICAL CONSTRAINT**: 
- You MUST ONLY suggest meal combinations using products from the AVAILABLE PRODUCTS list above
- DO NOT recommend items that are not in our catalog (e.g., if "goat meat" is not listed, don't suggest it)
- If a traditional meal requires an item we don't have, suggest an alternative from our catalog

**Task**: 
1. Review the AVAILABLE PRODUCTS and identify what Ghanaian meal patterns we can create
2. What are the traditional Ghanaian meal patterns for ${mealType} using ONLY our available products?
3. What food pairings are culturally appropriate from our catalog?
4. Suggest 3 specific Ghanaian meal combinations using ONLY available products for ${familySize} people.
5. If traditional items are missing, note what substitutions we should suggest.

Format your response as:
CULTURAL_CONTEXT: [brief context based on available products]
MEAL_PATTERNS: [pattern1], [pattern2], [pattern3]
AVAILABLE_FOR_RECOMMENDATION: [products from catalog that work]
MISSING_TRADITIONAL_ITEMS: [items we'd ideally want but don't have]
SUGGESTIONS: [3 meal ideas using ONLY available products]`;
                const xaiResponse = await this.xaiModel.invoke([
                    new messages_1.SystemMessage('You are an expert in Ghanaian cuisine and West African food culture.'),
                    new messages_1.HumanMessage(xaiPrompt)
                ]);
                const xaiContent = typeof xaiResponse.content === 'string'
                    ? xaiResponse.content
                    : JSON.stringify(xaiResponse.content);
                result.culturalContext = xaiContent;
                console.log('🧠 xAI Cultural Analysis completed');
            }
            catch (error) {
                console.warn('xAI cultural analysis failed, using local knowledge base:', error);
                // Fall back to local knowledge base
                const patterns = (0, cultural_food_matching_1.getMealPatternsForCulture)('ghanaian')
                    .filter(p => p.mealType === mealType.toLowerCase() || p.mealType === 'any')
                    .slice(0, 3)
                    .map(p => p.name);
                result.mealPatterns = patterns;
                result.culturalContext = 'Using local Ghanaian meal knowledge base';
            }
        }
        else {
            // Use local cultural knowledge base
            const patterns = (0, cultural_food_matching_1.getMealPatternsForCulture)('ghanaian')
                .filter(p => p.mealType === mealType.toLowerCase() || p.mealType === 'any')
                .slice(0, 3)
                .map(p => p.name);
            result.mealPatterns = patterns;
            result.culturalContext = 'Using local Ghanaian meal knowledge base (xAI not configured)';
        }
        // Step 2: Validate against local knowledge base
        const validation = (0, cultural_food_matching_1.validateGhanaianMeal)(userRequest.toLowerCase().split(/\s+/), mealType.toLowerCase());
        if (!validation.isComplete) {
            result.warnings.push(...validation.warnings);
            result.warnings.push(`Missing: ${validation.missingComponents.join(', ')}`);
        }
        return result;
    }
    /**
     * Second xAI pass: validate the main agent's recommended product list in Ghanaian context.
     * Returns feedback for the recommender only (not shown to user). Used to revise the list.
     */
    async performRecommendationValidation(productNames, mealType, familyContext) {
        if (!this.xaiModel || !productNames.length)
            return '';
        try {
            const list = productNames.slice(0, 30).join('\n- ');
            const prompt = `You are a Ghanaian food culture expert. We are about to show the user a shopping recommendation that includes these products for ${familyContext} (${mealType}):

- ${list}

**Task:** In 1–3 short sentences, validate whether these choices are culturally appropriate for a Ghanaian context.
- If any product is typically considered baby/child food (e.g. Cerelac, infant cereals) but is being recommended as a general staple for adults, say so and suggest a brief alternative (e.g. "For adult staples, consider plain rice or oats instead of Cerelac").
- If something is better suited to a different meal type, note it.
- If the selection is generally appropriate, respond with only: "OK" or "Looks good."
- Be concise. No preamble.`;
            const response = await this.xaiModel.invoke([
                new messages_1.SystemMessage('You give brief, factual validation notes for Ghanaian food recommendations. One to three sentences only.'),
                new messages_1.HumanMessage(prompt),
            ]);
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            const trimmed = content.trim();
            if (!trimmed || /^(ok|looks good|all good)\.?$/i.test(trimmed))
                return '';
            return trimmed;
        }
        catch (error) {
            console.warn('xAI recommendation validation failed:', error);
            return '';
        }
    }
    /**
     * Main agent revision pass: given xAI validation feedback, revise the recommendation list
     * (e.g. replace Cerelac with adult staples). User sees only the revised list; no cultural note.
     */
    async reviseRecommendationWithFeedback(currentRecommendation, validationFeedback, productContext, userRequest) {
        try {
            const systemPrompt = `You are Grovio AI. You previously gave this shopping recommendation. A Ghanaian food culture expert gave this feedback (for your use only; do not show this to the user):

"${validationFeedback}"

Revise your recommendation: replace any inappropriate products with better alternatives from the catalog below. Keep the same format (product name, price, quantity, brief "why"). Do not mention the expert or validation. Output only the revised recommendation.`;
            const humanPrompt = `User request: ${userRequest.slice(0, 500)}

**Current recommendation to revise:**
${currentRecommendation.slice(0, 6000)}

**Product catalog:**
${productContext.slice(0, 8000)}`;
            const response = await this.openAIModel.invoke([
                new messages_1.SystemMessage(systemPrompt),
                new messages_1.HumanMessage(humanPrompt),
            ]);
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            return content.trim() || null;
        }
        catch (error) {
            console.warn('Revise recommendation with feedback failed:', error);
            return null;
        }
    }
    async chat(message, userId, options = {}) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                return {
                    success: false,
                    error: 'AI service is not configured. Please set OPENAI_API_KEY.',
                };
            }
            const threadId = await this.getOrCreateThread(userId, options.threadId);
            const userContext = await this.getUserContext(userId, options.userToken);
            const queryIntent = this.extractQueryIntent(message, {
                ...userContext,
                role: options.role || userContext.role,
                // Do not seed family size from DB/profile for chat recommendations.
                // The current user prompt must drive this value.
                familySize: options.familySize,
                budget: options.budget,
            });
            // Prompt-first context: only use prompt/options for family size and budget.
            const context = {
                ...userContext,
                role: options.role || userContext.role,
                familySize: queryIntent.familySize ?? options.familySize,
                budget: queryIntent.budget ?? options.budget,
                threadId,
            };
            const products = await this.getProductsForRAGWithQuery(context, queryIntent, options.userToken);
            const productContext = this.buildProductContext(products, 200);
            const history = await this.getConversationHistory(threadId, userId);
            const historyMessages = history.slice(-6).map(h => h.role === 'user'
                ? new messages_1.HumanMessage(h.content)
                : new messages_1.AIMessage(h.content));
            const systemPrompt = (0, ai_prompts_1.buildProductRecommendationPrompt)(context, productContext);
            const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                ['system', systemPrompt],
                new prompts_1.MessagesPlaceholder('history'),
                ['human', '{message}'],
            ]);
            const chain = prompt.pipe(this.openAIModel).pipe(new output_parsers_1.StringOutputParser());
            const response = await chain.invoke({
                message,
                history: historyMessages,
            });
            const sanitizedResponse = this.sanitizeAssistantResponse(response);
            await this.saveMessageToThread(threadId, {
                role: 'user',
                content: message,
                timestamp: new Date(),
            }, userId);
            await this.saveMessageToThread(threadId, {
                role: 'assistant',
                content: sanitizedResponse,
                timestamp: new Date(),
            }, userId);
            // Return products used in context so frontend can show them as selectable (real DB products)
            const productsForFrontend = products.slice(0, 30).map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                quantity: 1,
                reason: 'From recommendation',
            }));
            return {
                success: true,
                message: sanitizedResponse,
                threadId,
                products: productsForFrontend,
            };
        }
        catch (error) {
            console.error('Enhanced AI chat error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'AI service error',
            };
        }
    }
    async getRecommendations(context, userToken) {
        try {
            const userContext = await this.getUserContext(context.userId, userToken);
            const fullContext = { ...userContext, ...context };
            const queryIntent = {
                keywords: fullContext.preferences || [],
                categories: fullContext.preferred_categories || [],
                budget: fullContext.budget,
                productTypes: [],
            };
            const products = await this.getProductsForRAGWithQuery(fullContext, queryIntent, userToken);
            if (products.length === 0) {
                return {
                    success: false,
                    error: 'No products available',
                };
            }
            const budget = fullContext.budget || 100;
            const result = this.generateBudgetBasket(products, fullContext, budget);
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            console.error('Recommendation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Recommendation service error',
            };
        }
    }
    generateBudgetBasket(products, context, budget) {
        const familySize = context.familySize || 1;
        const categoryPriority = {
            'Rice & Grains': 10,
            'Flour & Baking': 9,
            'Cooking Oils': 9,
            'Protein': 8,
            'Meat & Fish': 8,
            'Vegetables': 7,
            'Seasonings & Spices': 6,
            'Dairy & Eggs': 5,
            'Pasta & Noodles': 4,
            'Breakfast Cereals': 3,
            'Beverages': 2,
            'Canned Foods': 2,
        };
        const scoredProducts = products.map(p => {
            let score = categoryPriority[p.category_name] || 1;
            if (context.preferred_categories?.includes(p.category_name)) {
                score += 5;
            }
            score += p.rating * 0.5;
            if (p.price < 20 && score >= 7) {
                score += 2;
            }
            if (!p.in_stock) {
                score = -1;
            }
            return { product: p, score };
        });
        const sorted = scoredProducts
            .filter(sp => sp.score > 0)
            .sort((a, b) => b.score - a.score);
        const items = [];
        let remaining = budget;
        const categoriesIncluded = new Set();
        for (const { product } of sorted) {
            if (remaining <= 5)
                break;
            const baseQty = product.price <= 15 ? Math.min(2, Math.ceil(familySize / 2)) : 1;
            const maxAffordable = Math.floor(remaining / product.price);
            const quantity = Math.min(baseQty, maxAffordable);
            if (quantity <= 0)
                continue;
            const subtotal = quantity * product.price;
            const categoryCount = Array.from(categoriesIncluded).filter(c => c === product.category_name).length;
            if (categoryCount >= 2 && categoriesIncluded.size < 4) {
                continue;
            }
            items.push({
                productId: product.id,
                productName: product.name,
                quantity,
                price: product.price,
                subtotal,
                category: product.category_name,
                inStock: product.in_stock,
            });
            remaining -= subtotal;
            categoriesIncluded.add(product.category_name);
            if (categoriesIncluded.size >= 5 && remaining < budget * 0.2) {
                break;
            }
        }
        const total = items.reduce((sum, item) => sum + item.subtotal, 0);
        const savings = budget - total;
        const utilization = (total / budget) * 100;
        const roleText = context.role || 'shopper';
        const categoriesText = Array.from(categoriesIncluded).join(', ');
        const rationale = `Optimized a budget-friendly basket for a ${roleText} (family size ${familySize}). Selected ${items.length} essential items across ${categoriesIncluded.size} categories (${categoriesText}), prioritizing staples, proteins, and fresh produce to maximize nutritional value within your ₵${budget.toFixed(2)} budget.`;
        const hasCarbs = items.some(i => ['Rice & Grains', 'Pasta & Noodles', 'Flour & Baking'].includes(i.category));
        const hasProteins = items.some(i => ['Protein', 'Meat & Fish', 'Dairy & Eggs'].includes(i.category));
        const hasVitamins = items.some(i => i.category === 'Vegetables');
        return {
            items,
            total,
            savings,
            rationale,
            budgetUtilization: parseFloat(utilization.toFixed(1)),
            nutritionalBalance: {
                carbohydrates: hasCarbs ? 'good' : 'low',
                proteins: hasProteins ? 'good' : 'low',
                vitamins: hasVitamins ? 'good' : 'low',
            },
        };
    }
    async searchProducts(query, userId, limit = 10, userToken) {
        try {
            const _userContext = await this.getUserContext(userId, userToken);
            const productsSupabase = userToken
                ? this.getUserSupabaseClient(userToken)
                : (0, supabase_1.createClient)();
            const searchQuery = `%${query.toLowerCase()}%`;
            const { data: products, error } = await productsSupabase
                .from('products')
                .select('*')
                .or(`name.ilike.${searchQuery},description.ilike.${searchQuery},category_name.ilike.${searchQuery},subcategory.ilike.${searchQuery},brand.ilike.${searchQuery}`)
                .eq('in_stock', true)
                .order('rating', { ascending: false })
                .limit(limit);
            if (error) {
                console.warn('RLS blocked product search, using admin client fallback');
                const { data: fallbackProducts } = await this.adminSupabase
                    .from('products')
                    .select('*')
                    .or(`name.ilike.${searchQuery},description.ilike.${searchQuery},category_name.ilike.${searchQuery},subcategory.ilike.${searchQuery},brand.ilike.${searchQuery}`)
                    .eq('in_stock', true)
                    .order('rating', { ascending: false })
                    .limit(limit);
                return {
                    success: true,
                    data: fallbackProducts || [],
                };
            }
            return {
                success: true,
                data: products || [],
            };
        }
        catch (error) {
            console.error('AI search error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Search failed',
            };
        }
    }
    async analyzeBudget(budget, familySize, duration, userId, userToken) {
        try {
            const userContext = await this.getUserContext(userId, userToken);
            const products = await this.getProductsForRAG(userContext, userToken);
            const productContext = this.buildProductContext(products, 50);
            const daysCount = duration === 'day' ? 1 : duration === 'week' ? 7 : 30;
            const dailyBudget = budget / daysCount;
            const perPerson = dailyBudget / familySize;
            const mealsPerDay = 3;
            const costPerMeal = perPerson / mealsPerDay;
            const prompt = `Analyze this grocery budget for a Ghanaian household:

**Budget Details:**
- Total Budget: ₵${budget}
- Duration: ${duration} (${daysCount} days)
- Family Size: ${familySize} people
- Daily Budget: ₵${dailyBudget.toFixed(2)}
- Per Person Daily: ₵${perPerson.toFixed(2)}
- Estimated Cost per Meal: ₵${costPerMeal.toFixed(2)}

**Available Products (sample):**
${productContext.split('\n').slice(0, 20).join('\n')}

Provide:
1. Recommended budget allocation across categories (₵ amounts)
2. Estimated number of meals possible
3. 3-5 practical suggestions to maximize value
4. Any warnings or concerns about budget adequacy

Format as JSON with this structure:
{
  "recommendedAllocation": {
    "essentials": number,
    "proteins": number,
    "vegetables": number,
    "other": number
  },
  "estimatedMeals": number,
  "costPerMeal": number,
  "suggestions": string[],
  "warnings": string[],
  "budgetAdequacy": "excellent" | "good" | "tight" | "insufficient"
}`;
            const response = await this.openAIModel.invoke(prompt);
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            // Try to parse JSON response
            let analysisData;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch && jsonMatch[0]) {
                    // Validate JSON string length before parsing
                    const jsonStr = jsonMatch[0];
                    if (jsonStr.length > 50000) {
                        throw new Error('JSON response too large');
                    }
                    const parsed = JSON.parse(jsonStr);
                    // Validate parsed object structure
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        analysisData = parsed;
                    }
                    else {
                        throw new Error('Invalid JSON structure');
                    }
                }
                else {
                    analysisData = {
                        recommendedAllocation: {
                            essentials: budget * 0.4,
                            proteins: budget * 0.3,
                            vegetables: budget * 0.2,
                            other: budget * 0.1,
                        },
                        estimatedMeals: Math.floor(budget / (costPerMeal * familySize)),
                        costPerMeal,
                        suggestions: [
                            'Prioritize staples like rice, flour, and cooking oil',
                            'Buy proteins in bulk when on sale',
                            'Include seasonal vegetables for freshness',
                        ],
                        warnings: budget < 50 * familySize * (daysCount / 7) ? ['Budget may be tight for this duration'] : [],
                        budgetAdequacy: budget >= 100 * familySize ? 'good' : 'tight',
                    };
                }
            }
            catch {
                analysisData = {
                    estimatedMeals: Math.floor((budget / familySize) / 10),
                    costPerMeal,
                    suggestions: ['Consider buying in bulk', 'Focus on staples first'],
                    warnings: [],
                };
            }
            return {
                success: true,
                data: analysisData,
            };
        }
        catch (error) {
            console.error('Budget analysis error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Analysis failed',
            };
        }
    }
    /**
     * Generate meal suggestions based on ingredients and preferences
     * @param userToken - Optional user token to respect RLS policies
     */
    async getMealSuggestions(ingredients, mealType, dietaryRestrictions, familySize, userId, userToken) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                return {
                    success: false,
                    error: 'AI service is not configured',
                };
            }
            await this.getUserContext(userId, userToken);
            const prompt = `Suggest 3 Ghanaian or African-inspired meal ideas:

**Available Ingredients:** ${ingredients.join(', ')}
**Meal Type:** ${mealType}
**Dietary Restrictions:** ${dietaryRestrictions.join(', ') || 'None'}
**Servings:** ${familySize} people

Provide 3 meal suggestions. For each meal, include:
- Name (Ghanaian/African dish preferred)
- Brief description
- Complete ingredient list (prioritize the available ingredients)
- Estimated cost in ₵
- Difficulty (easy/medium/hard)
- Cooking time in minutes

Format as JSON array:
[{
  "name": "Jollof Rice",
  "description": "...",
  "ingredients": ["Rice", "Tomatoes", ...],
  "estimatedCost": 120,
  "servings": ${familySize},
  "difficulty": "medium",
  "cookingTime": 45,
  "cuisine": "Ghanaian"
}]`;
            const response = await this.openAIModel.invoke(prompt);
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            let meals;
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
                        meals = parsed;
                    }
                    else {
                        throw new Error('Invalid JSON structure - expected array');
                    }
                }
                else {
                    meals = [];
                }
            }
            catch {
                meals = [
                    {
                        name: 'Jollof Rice with Chicken',
                        description: 'Traditional Ghanaian jollof rice with grilled chicken',
                        ingredients: ingredients.slice(0, 5),
                        estimatedCost: 100,
                        servings: familySize,
                        difficulty: 'medium',
                        cookingTime: 60,
                    },
                ];
            }
            return {
                success: true,
                data: meals,
            };
        }
        catch (error) {
            console.error('Meal suggestions error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate meal suggestions',
            };
        }
    }
    /**
     * Delete old conversation threads (cleanup)
     * SECURITY: Uses admin client - this is a maintenance operation
     */
    async cleanupOldThreads(olderThanDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            // SECURITY: Admin client used for cleanup operation
            // This is acceptable for maintenance tasks
            await this.adminSupabase
                .from('ai_conversation_threads')
                .delete()
                .lt('updated_at', cutoffDate.toISOString());
            console.log(`Cleaned up conversation threads older than ${olderThanDays} days`);
        }
        catch (error) {
            console.error('Error cleaning up threads:', error);
        }
    }
}
exports.AIEnhancedService = AIEnhancedService;
// Helper function (exported for use in service)
// SECURITY: This function uses admin client - should be updated to use user token
async function _getUserContext(userId, userToken) {
    try {
        // SECURITY: Use user token if available to respect RLS
        // If no token (guest), return minimal context; userId is the guest UUID from controller
        if (!userToken) {
            return {
                userId,
                familySize: 1,
            };
        }
        // Use user's token to create client that respects RLS
        const supabase = (0, supabase_1.createClient)();
        // Set the user's session token
        await supabase.auth.setSession({
            access_token: userToken,
            refresh_token: '',
        });
        const { data: preferences } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();
        // If RLS blocks, fall back to admin client (with warning)
        if (!preferences) {
            console.warn('RLS blocked user preferences access, using admin client fallback');
            const adminSupabase = (0, supabase_1.createAdminClient)();
            const { data: adminPreferences } = await adminSupabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
            const hash = Buffer.from(userId).toString('base64').substring(0, 10);
            return {
                userId: `anon_${hash}`,
                role: adminPreferences?.role || 'customer',
                familySize: adminPreferences?.family_size || 1,
                preferences: adminPreferences?.preferred_categories || [],
                dietary_restrictions: adminPreferences?.dietary_restrictions || [],
                preferred_categories: adminPreferences?.preferred_categories || [],
            };
        }
        const hash = Buffer.from(userId).toString('base64').substring(0, 10);
        return {
            userId: `anon_${hash}`,
            role: preferences?.role || 'customer',
            familySize: preferences?.family_size || 1,
            preferences: preferences?.preferred_categories || [],
            dietary_restrictions: preferences?.dietary_restrictions || [],
            preferred_categories: preferences?.preferred_categories || [],
        };
    }
    catch {
        const hash = Buffer.from(userId).toString('base64').substring(0, 10);
        return {
            userId: `anon_${hash}`,
            familySize: 1,
        };
    }
}
