"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIEnhancedService = void 0;
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const messages_1 = require("@langchain/core/messages");
const supabase_1 = require("../config/supabase");
const uuid_1 = require("uuid");
class AIEnhancedService {
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn('OPENAI_API_KEY not set. AI features will be disabled.');
        }
        this.model = new openai_1.ChatOpenAI({
            apiKey: apiKey || 'dummy',
            modelName: 'gpt-4o-mini',
            temperature: 0.3,
            maxTokens: 1500,
        });
        this.adminSupabase = (0, supabase_1.createAdminClient)();
    }
    getUserSupabaseClient(userToken) {
        const client = (0, supabase_1.createClient)();
        if (userToken) {
            client.auth.setSession({
                access_token: userToken,
                refresh_token: '',
            }).catch(err => {
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
            if (!userToken || userId === 'anonymous') {
                return {
                    userId: 'anon_anonymous',
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
        const budgetMatch = message.match(/₵?\s*(\d+(?:\.\d+)?)/) || message.match(/(\d+(?:\.\d+)?)\s*cedis?/i);
        const extractedBudget = budgetMatch ? parseFloat(budgetMatch[1]) : context.budget;
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
            productTypes: [...new Set(productTypes)],
        };
    }
    async getProductsForRAGWithQuery(context, queryIntent, userToken) {
        try {
            const productsSupabase = userToken
                ? this.getUserSupabaseClient(userToken)
                : (0, supabase_1.createClient)();
            let query = productsSupabase
                .from('products')
                .select('*')
                .eq('in_stock', true);
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
                const budget = queryIntent?.budget || context.budget || 1000;
            }
            query = query.order('rating', { ascending: false })
                .order('price', { ascending: true });
            const limit = 500;
            const { data: products, error } = await query.limit(limit);
            if (error) {
                console.error('Error fetching products (RLS may have blocked access):', error);
                console.warn('Using admin client for products access (RLS blocked regular client)');
                const { data: fallbackProducts } = await this.adminSupabase
                    .from('products')
                    .select('*')
                    .eq('in_stock', true)
                    .order('rating', { ascending: false })
                    .limit(200);
                return fallbackProducts || [];
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
                    .eq('in_stock', true)
                    .order('rating', { ascending: false })
                    .limit(200);
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
    async getConversationHistory(threadId, userId) {
        try {
            let query = this.adminSupabase
                .from('ai_conversation_threads')
                .select('messages')
                .eq('thread_id', threadId);
            if (userId) {
                query = query.eq('user_id', userId);
            }
            const { data: thread } = await query.single();
            return (thread?.messages || []);
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
            const context = {
                ...userContext,
                role: options.role || userContext.role,
                familySize: options.familySize || userContext.familySize,
                budget: options.budget,
                threadId,
            };
            const queryIntent = this.extractQueryIntent(message, context);
            const products = await this.getProductsForRAGWithQuery(context, queryIntent, options.userToken);
            const productContext = this.buildProductContext(products, 200);
            const history = await this.getConversationHistory(threadId, userId);
            const historyMessages = history.slice(-6).map(h => h.role === 'user'
                ? new messages_1.HumanMessage(h.content)
                : new messages_1.AIMessage(h.content));
            const systemPrompt = `You are Grovio AI, an intelligent grocery shopping assistant for Ghanaian shoppers. All prices are in Ghanaian Cedis (₵).

**Your Capabilities:**
- Provide personalized grocery recommendations based on budget, family size, and preferences
- Suggest meal plans and recipes using ONLY products from the database catalog
- Help users maximize value within their budget
- Understand Ghanaian cuisine and shopping patterns

**User Context:**
- User Profile: ${context.role || 'customer'} | Family Size: ${context.familySize || 1}
- Budget: ${context.budget ? `₵${context.budget}` : 'Not specified'}
- Dietary Restrictions: ${context.dietary_restrictions?.join(', ') || 'None'}
- Preferred Categories: ${context.preferred_categories?.join(', ') || 'None'}
- Query Intent: ${queryIntent.keywords.length > 0 ? `Looking for: ${queryIntent.keywords.join(', ')}` : 'General inquiry'}

**CRITICAL RULES - READ CAREFULLY:**
1. **ONLY use products from the catalog below** - You MUST NOT invent, suggest, or mention products that are not in the catalog
2. **Use exact product names** as they appear in the catalog (e.g., if catalog shows "Royal Rice", use "Royal Rice", not "rice" or "Royal White Basmati Rice")
3. **Check product availability** - Only recommend products marked with ✓ (in stock)
4. **Respect budget constraints** - Stay within budget if specified (±5% tolerance is acceptable)
5. **Prioritize by category**: Staples (rice, flour, oil) → Proteins → Vegetables → Others
6. **Consider family size** when suggesting quantities
7. **Respect dietary restrictions** - Do not suggest products from restricted categories
8. **Use ₵ symbol** for all prices
9. **Format important text** with **bold** for emphasis
10. **Be culturally appropriate** - Suggest Ghanaian/African meal ideas when relevant
11. **If a product is not in the catalog**, say "I don't see that product in our current catalog" - DO NOT make up product names or prices

**Product Catalog (Database):**
${productContext}

**Example Response Format:**
When recommending products, format like this:
- **Product Name** (from catalog) - ₵X.XX
- Quantity: X units
- Category: [Category Name]
- Why: [Brief reason]

**Security Note:**
- You're working with user ID: ${context.userId} (anonymized)
- NEVER mention or expose real user identities, emails, or personal information`;
            const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                ['system', systemPrompt],
                new prompts_1.MessagesPlaceholder('history'),
                ['human', '{message}'],
            ]);
            const chain = prompt.pipe(this.model).pipe(new output_parsers_1.StringOutputParser());
            const response = await chain.invoke({
                message,
                history: historyMessages,
            });
            await this.saveMessageToThread(threadId, {
                role: 'user',
                content: message,
                timestamp: new Date(),
            }, userId);
            await this.saveMessageToThread(threadId, {
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            }, userId);
            return {
                success: true,
                message: response,
                threadId,
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
        for (const { product, score } of sorted) {
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
            const userContext = await this.getUserContext(userId, userToken);
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
            const response = await this.model.invoke(prompt);
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
            catch (error) {
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
            const userContext = await this.getUserContext(userId, userToken);
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
            const response = await this.model.invoke(prompt);
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
            catch (error) {
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
async function getUserContext(userId, userToken) {
    try {
        // SECURITY: Use user token if available to respect RLS
        // If no token or anonymous user, return minimal context
        if (!userToken || userId === 'anonymous') {
            return {
                userId: 'anon_anonymous',
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
    catch (error) {
        const hash = Buffer.from(userId).toString('base64').substring(0, 10);
        return {
            userId: `anon_${hash}`,
            familySize: 1,
        };
    }
}
