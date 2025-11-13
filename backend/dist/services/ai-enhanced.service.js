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
            modelName: 'gpt-4o-mini', // Fast and cost-effective
            temperature: 0.3, // More deterministic for recommendations
            maxTokens: 1500,
        });
        // SECURITY NOTE: Admin client is used ONLY for products table
        // Products should be publicly readable in an e-commerce context
        // If RLS policies allow public SELECT on products, we should use createClient() instead
        // Admin client is used here as a fallback to ensure RAG works even if RLS blocks anonymous access
        // TODO: Review RLS policies - products table should allow public SELECT for shopping
        this.adminSupabase = (0, supabase_1.createAdminClient)();
    }
    /**
     * Get Supabase client with user context (respects RLS)
     * Uses user's token if available to create an authenticated client
     * For server-side: We create a client and manually set the access token
     */
    getUserSupabaseClient(userToken) {
        const client = (0, supabase_1.createClient)();
        if (userToken) {
            // Set the user's access token in the client's auth headers
            // This allows RLS policies to identify the user
            // Note: This is a server-side workaround - in production, RLS should handle this
            client.auth.setSession({
                access_token: userToken,
                refresh_token: '', // Not needed for server-side operations
            }).catch(err => {
                // If setting session fails, log but continue (client will use anon key)
                console.warn('Failed to set user session in Supabase client:', err.message);
            });
        }
        // Return client - it will use the token if set, otherwise use anon key
        // RLS policies will determine access based on the token
        return client;
    }
    /**
     * Anonymize user ID for AI interactions
     * AI sees: anon_abc123
     * Backend knows: maps to real user UUID
     */
    anonymizeUserId(userId) {
        // Create a deterministic hash that's reversible by backend only
        const hash = Buffer.from(userId).toString('base64').substring(0, 10);
        return `anon_${hash}`;
    }
    /**
     * Get user context securely (AI never sees PII)
     * Uses user's token context to respect RLS policies
     */
    async getUserContext(userId, userToken) {
        try {
            // Use user's token context to respect RLS
            // If no token, user is anonymous and we can't access user data
            if (!userToken || userId === 'anonymous') {
                return {
                    userId: 'anon_anonymous',
                    familySize: 1,
                };
            }
            const userSupabase = this.getUserSupabaseClient(userToken);
            // For user data, we should respect RLS by using the user's token
            // However, if RLS blocks access, we might need admin client as fallback
            // But this should be avoided - RLS should allow users to read their own data
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
            // If RLS blocks access, try with admin client as fallback (with logging)
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
                userId: this.anonymizeUserId(userId), // Anonymized for AI
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
    /**
     * Extract query intent from user message for better product retrieval
     */
    extractQueryIntent(message, context) {
        const lowerMessage = message.toLowerCase();
        const keywords = [];
        const categories = [];
        const productTypes = [];
        // Extract budget if mentioned
        const budgetMatch = message.match(/₵?\s*(\d+(?:\.\d+)?)/) || message.match(/(\d+(?:\.\d+)?)\s*cedis?/i);
        const extractedBudget = budgetMatch ? parseFloat(budgetMatch[1]) : context.budget;
        // Common product keywords
        const productKeywords = [
            'rice', 'flour', 'oil', 'sugar', 'salt', 'tomato', 'onion', 'garlic',
            'chicken', 'fish', 'meat', 'beef', 'pork', 'milk', 'egg', 'bread',
            'noodle', 'pasta', 'cereal', 'beverage', 'drink', 'water', 'juice',
            'vegetable', 'fruit', 'spice', 'seasoning', 'sauce', 'canned', 'frozen'
        ];
        // Category mapping
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
        // Extract keywords and categories
        for (const keyword of productKeywords) {
            if (lowerMessage.includes(keyword)) {
                keywords.push(keyword);
                if (categoryMap[keyword]) {
                    categories.push(...categoryMap[keyword]);
                }
            }
        }
        // Extract specific product mentions
        const productMentions = message.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
        productTypes.push(...productMentions.slice(0, 10));
        return {
            keywords: [...new Set(keywords)],
            categories: [...new Set(categories)],
            budget: extractedBudget,
            productTypes: [...new Set(productTypes)],
        };
    }
    /**
     * Fetch products from database with query-based intelligent retrieval
     * This method scales to thousands of products by using intelligent filtering
     *
     * SECURITY NOTE: Uses admin client for products access
     * This is acceptable because:
     * 1. Products should be publicly readable in an e-commerce context
     * 2. RLS policies on products table should allow SELECT for all users
     * 3. If RLS blocks anonymous access, admin client ensures RAG works
     * TODO: Review RLS policies - products should allow public SELECT
     */
    async getProductsForRAGWithQuery(context, queryIntent, userToken) {
        try {
            // SECURITY: Try to use regular client first (respects RLS)
            // Products should be publicly readable, so this should work
            const productsSupabase = userToken
                ? this.getUserSupabaseClient(userToken)
                : (0, supabase_1.createClient)(); // Anonymous client for public products
            // Start with base query for in-stock products
            let query = productsSupabase
                .from('products')
                .select('*')
                .eq('in_stock', true);
            // If query intent exists, use it for intelligent filtering
            if (queryIntent && (queryIntent.keywords.length > 0 || queryIntent.categories.length > 0 || queryIntent.productTypes.length > 0)) {
                // Build search terms - prioritize the most relevant terms
                const allSearchTerms = [...queryIntent.keywords, ...queryIntent.productTypes].filter(term => term && term.length > 2);
                if (allSearchTerms.length > 0) {
                    // Use the primary search term for initial filtering
                    // Supabase .or() format: "field1.ilike.pattern1,field2.ilike.pattern1,field3.ilike.pattern2,..."
                    const primaryTerm = allSearchTerms[0];
                    const searchPattern = `%${primaryTerm}%`;
                    // Search across multiple fields for the primary term
                    query = query.or(`name.ilike.${searchPattern},description.ilike.${searchPattern},brand.ilike.${searchPattern},category_name.ilike.${searchPattern},subcategory.ilike.${searchPattern}`);
                    // For additional terms, we'll filter results in memory if needed
                    // This approach scales better than complex nested queries
                }
                // Filter by extracted categories if available (this is more specific than keywords)
                if (queryIntent.categories.length > 0) {
                    query = query.in('category_name', queryIntent.categories);
                }
            }
            else {
                // No query intent - use preferred categories if available
                if (context.preferred_categories && context.preferred_categories.length > 0) {
                    query = query.in('category_name', context.preferred_categories);
                }
            }
            // Filter by dietary restrictions
            if (context.dietary_restrictions) {
                if (context.dietary_restrictions.includes('vegetarian')) {
                    query = query.not('category_name', 'in', '("Protein", "Meat & Fish")');
                }
                if (context.dietary_restrictions.includes('vegan')) {
                    query = query.not('category_name', 'in', '("Protein", "Meat & Fish", "Dairy & Eggs")');
                }
            }
            // Budget-based filtering: if budget is specified, prioritize affordable products
            if (queryIntent?.budget || context.budget) {
                const budget = queryIntent?.budget || context.budget || 1000;
                // Don't filter by price, but we'll sort by value (rating/price ratio) later
            }
            // Order by rating first, then by price (value)
            query = query.order('rating', { ascending: false })
                .order('price', { ascending: true });
            // Fetch with higher limit for better coverage
            // Use pagination to get more products if needed
            const limit = 500; // Increased from 100 to 500 for better coverage
            const { data: products, error } = await query.limit(limit);
            if (error) {
                console.error('Error fetching products (RLS may have blocked access):', error);
                // SECURITY: If RLS blocks access, use admin client as fallback
                // This should be logged and reviewed - products should be publicly readable
                console.warn('Using admin client for products access (RLS blocked regular client)');
                // Fallback: try fetching without filters using admin client
                const { data: fallbackProducts } = await this.adminSupabase
                    .from('products')
                    .select('*')
                    .eq('in_stock', true)
                    .order('rating', { ascending: false })
                    .limit(200);
                return fallbackProducts || [];
            }
            // Post-process: Score and rank products by relevance to query intent
            let rankedProducts = products || [];
            if (queryIntent && (queryIntent.keywords.length > 1 || queryIntent.productTypes.length > 0)) {
                rankedProducts = this.scoreProductsByRelevance(rankedProducts, queryIntent);
            }
            // If we got fewer products than expected and no query intent, fetch more
            if (rankedProducts.length < 100 && (!queryIntent || queryIntent.keywords.length === 0)) {
                // Fetch additional products from different categories
                // Use the same client (respects RLS)
                const { data: additionalProducts } = await productsSupabase
                    .from('products')
                    .select('*')
                    .eq('in_stock', true)
                    .order('created_at', { ascending: false })
                    .limit(200);
                if (additionalProducts) {
                    // Merge and deduplicate
                    const existingIds = new Set(rankedProducts.map(p => p.id));
                    const newProducts = additionalProducts.filter(p => !existingIds.has(p.id));
                    rankedProducts = [...rankedProducts, ...newProducts];
                }
                else {
                    // If RLS blocks, try admin client as fallback
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
            // Fallback to basic query using admin client (RLS may have blocked access)
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
    /**
     * Score products by relevance to query intent
     * This helps prioritize the most relevant products for the user's query
     */
    scoreProductsByRelevance(products, queryIntent) {
        const allSearchTerms = [...queryIntent.keywords, ...queryIntent.productTypes].map(term => term.toLowerCase());
        return products.map(product => {
            let score = 0;
            const productText = `${product.name} ${product.description || ''} ${product.brand || ''} ${product.category_name} ${product.subcategory || ''}`.toLowerCase();
            // Score based on keyword matches
            allSearchTerms.forEach(term => {
                if (productText.includes(term)) {
                    // Exact matches in name get highest score
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
            // Boost score for products in preferred categories
            if (queryIntent.categories.length > 0 && queryIntent.categories.includes(product.category_name)) {
                score += 5;
            }
            // Boost score for higher ratings
            score += product.rating * 0.5;
            // Budget-aware scoring: if budget is specified, prioritize affordable products
            if (queryIntent.budget && product.price <= queryIntent.budget * 0.1) {
                score += 3; // Bonus for affordable products relative to budget
            }
            return { product, score };
        })
            .sort((a, b) => b.score - a.score) // Sort by score descending
            .map(item => item.product); // Extract products
    }
    /**
     * Legacy method - kept for backward compatibility
     */
    async getProductsForRAG(context, userToken) {
        return this.getProductsForRAGWithQuery(context, undefined, userToken);
    }
    /**
     * Build optimized product catalog context for LLM with comprehensive product details
     * This method formats products to give the AI maximum context for accurate recommendations
     */
    buildProductContext(products, limit = 200) {
        if (!products || products.length === 0) {
            return 'No products available in the database.';
        }
        // Group products by category for better organization
        const productsByCategory = new Map();
        products.forEach(p => {
            const category = p.category_name || 'Uncategorized';
            if (!productsByCategory.has(category)) {
                productsByCategory.set(category, []);
            }
            productsByCategory.get(category).push(p);
        });
        // Build context with category sections
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
    /**
     * Get or create conversation thread
     * SECURITY: Uses admin client for thread operations
     * TODO: Use user token to respect RLS - threads should be user-specific
     */
    async getOrCreateThread(userId, threadId) {
        try {
            if (threadId) {
                // Verify thread exists and belongs to user
                // SECURITY: This should use user's token to respect RLS
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
            // Create new thread
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
            return (0, uuid_1.v4)(); // Fallback to new thread
        }
    }
    /**
     * Get conversation history for thread continuity
     * SECURITY: Uses admin client - should use user token to respect RLS
     */
    async getConversationHistory(threadId) {
        try {
            // SECURITY: This should use user's token to respect RLS
            // Threads should only be accessible by the owner
            const { data: thread } = await this.adminSupabase
                .from('ai_conversation_threads')
                .select('messages')
                .eq('thread_id', threadId)
                .single();
            return (thread?.messages || []);
        }
        catch (error) {
            console.error('Error getting conversation history:', error);
            return [];
        }
    }
    /**
     * Save message to conversation thread
     * SECURITY: Uses admin client - should use user token to respect RLS
     */
    async saveMessageToThread(threadId, message) {
        try {
            const history = await this.getConversationHistory(threadId);
            history.push(message);
            // SECURITY: This should use user's token to respect RLS
            await this.adminSupabase
                .from('ai_conversation_threads')
                .update({
                messages: history,
                updated_at: new Date().toISOString(),
            })
                .eq('thread_id', threadId);
        }
        catch (error) {
            console.error('Error saving message:', error);
        }
    }
    /**
     * Enhanced chat with RAG, thread support, and context awareness
     * @param userToken - Optional user token to respect RLS policies
     */
    async chat(message, userId, options = {}) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                return {
                    success: false,
                    error: 'AI service is not configured. Please set OPENAI_API_KEY.',
                };
            }
            // Get or create thread (uses admin client for thread management)
            // Threads are user-specific and should respect RLS, but we use admin client for now
            // TODO: Use user token for thread operations to respect RLS
            const threadId = await this.getOrCreateThread(userId, options.threadId);
            // Get user context (anonymized) - uses user token to respect RLS
            const userContext = await this.getUserContext(userId, options.userToken);
            // Override with provided options
            const context = {
                ...userContext,
                role: options.role || userContext.role,
                familySize: options.familySize || userContext.familySize,
                budget: options.budget,
                threadId,
            };
            // Extract intent from user message for better product retrieval
            const queryIntent = this.extractQueryIntent(message, context);
            // Fetch products from database with query-based retrieval
            // Pass user token to respect RLS (products should be publicly readable)
            const products = await this.getProductsForRAGWithQuery(context, queryIntent, options.userToken);
            // Build comprehensive product context with ALL relevant products
            const productContext = this.buildProductContext(products, 200); // Increased from 80 to 200
            // Get conversation history
            const history = await this.getConversationHistory(threadId);
            const historyMessages = history.slice(-6).map(h => h.role === 'user'
                ? new messages_1.HumanMessage(h.content)
                : new messages_1.AIMessage(h.content));
            // Build system prompt with strict product usage rules
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
            // Save messages to thread
            await this.saveMessageToThread(threadId, {
                role: 'user',
                content: message,
                timestamp: new Date(),
            });
            await this.saveMessageToThread(threadId, {
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            });
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
    /**
     * Get intelligent product recommendations using RAG
     * @param userToken - Optional user token to respect RLS policies
     */
    async getRecommendations(context, userToken) {
        try {
            // Get user's full context (uses user token to respect RLS)
            const userContext = await this.getUserContext(context.userId, userToken);
            const fullContext = { ...userContext, ...context };
            // Fetch products from database using query-based retrieval
            // Extract intent from budget and preferences for better product matching
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
            // Use deterministic algorithm for recommendations
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
    /**
     * Enhanced budget basket generation with intelligent prioritization
     */
    generateBudgetBasket(products, context, budget) {
        const familySize = context.familySize || 1;
        // Priority scoring system
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
        // Score products
        const scoredProducts = products.map(p => {
            let score = categoryPriority[p.category_name] || 1;
            // Boost score for preferred categories
            if (context.preferred_categories?.includes(p.category_name)) {
                score += 5;
            }
            // Boost for better ratings
            score += p.rating * 0.5;
            // Boost for value (lower price for essentials)
            if (p.price < 20 && score >= 7) {
                score += 2;
            }
            // Penalty for out of stock
            if (!p.in_stock) {
                score = -1;
            }
            return { product: p, score };
        });
        // Sort by score
        const sorted = scoredProducts
            .filter(sp => sp.score > 0)
            .sort((a, b) => b.score - a.score);
        // Build basket
        const items = [];
        let remaining = budget;
        const categoriesIncluded = new Set();
        for (const { product, score } of sorted) {
            if (remaining <= 5)
                break; // Leave some buffer
            // Determine quantity based on price and family size
            const baseQty = product.price <= 15 ? Math.min(2, Math.ceil(familySize / 2)) : 1;
            const maxAffordable = Math.floor(remaining / product.price);
            const quantity = Math.min(baseQty, maxAffordable);
            if (quantity <= 0)
                continue;
            const subtotal = quantity * product.price;
            // Add diversity - don't overfill with one category
            const categoryCount = Array.from(categoriesIncluded).filter(c => c === product.category_name).length;
            if (categoryCount >= 2 && categoriesIncluded.size < 4) {
                continue; // Skip to add diversity
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
            // Stop if we have good diversity and utilized budget well
            if (categoriesIncluded.size >= 5 && remaining < budget * 0.2) {
                break;
            }
        }
        const total = items.reduce((sum, item) => sum + item.subtotal, 0);
        const savings = budget - total;
        const utilization = (total / budget) * 100;
        // Generate rationale
        const roleText = context.role || 'shopper';
        const categoriesText = Array.from(categoriesIncluded).join(', ');
        const rationale = `Optimized a budget-friendly basket for a ${roleText} (family size ${familySize}). Selected ${items.length} essential items across ${categoriesIncluded.size} categories (${categoriesText}), prioritizing staples, proteins, and fresh produce to maximize nutritional value within your ₵${budget.toFixed(2)} budget.`;
        // Nutritional balance assessment
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
    /**
     * AI-powered product search with semantic understanding
     * @param userToken - Optional user token to respect RLS policies
     */
    async searchProducts(query, userId, limit = 10, userToken) {
        try {
            const userContext = await this.getUserContext(userId, userToken);
            // Database search with full-text and similarity
            // Use user token to respect RLS (products should be publicly readable)
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
                // If RLS blocks, try admin client as fallback
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
    /**
     * Budget analysis with AI insights
     * @param userToken - Optional user token to respect RLS policies
     */
    async analyzeBudget(budget, familySize, duration, userId, userToken) {
        try {
            const userContext = await this.getUserContext(userId, userToken);
            // Fetch products for context (uses user token to respect RLS)
            const products = await this.getProductsForRAG(userContext, userToken);
            const productContext = this.buildProductContext(products, 50);
            // Calculate budget metrics
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
                analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {
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
                meals = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
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
