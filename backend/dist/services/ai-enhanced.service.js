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
        this.supabase = (0, supabase_1.createClient)();
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
     */
    async getUserContext(userId) {
        try {
            const { data: user } = await this.supabase
                .from('users')
                .select('id, role, preferences')
                .eq('id', userId)
                .single();
            const { data: preferences } = await this.supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
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
     * Fetch products from database with smart filtering
     */
    async getProductsForRAG(context) {
        try {
            let query = this.supabase
                .from('products')
                .select('*')
                .eq('in_stock', true)
                .order('rating', { ascending: false });
            // Filter by preferred categories if available
            if (context.preferred_categories && context.preferred_categories.length > 0) {
                query = query.in('category_name', context.preferred_categories);
            }
            // Filter by dietary restrictions
            if (context.dietary_restrictions) {
                if (context.dietary_restrictions.includes('vegetarian')) {
                    query = query.not('category_name', 'in', '("Protein", "Meat & Fish")');
                }
                // Add more dietary filters as needed
            }
            const { data: products, error } = await query.limit(100);
            if (error) {
                console.error('Error fetching products:', error);
                return [];
            }
            return products || [];
        }
        catch (error) {
            console.error('Error in getProductsForRAG:', error);
            return [];
        }
    }
    /**
     * Build optimized product catalog context for LLM
     */
    buildProductContext(products, limit = 60) {
        const contextLines = products.slice(0, limit).map(p => {
            const inStock = p.in_stock ? '✓' : '✗';
            return `[${inStock}] ${p.name} | Cat:${p.category_name}/${p.subcategory || 'N/A'} | ₵${p.price.toFixed(2)} | Stock:${p.quantity} | Rating:${p.rating}/5.0`;
        });
        return contextLines.join('\n');
    }
    /**
     * Get or create conversation thread
     */
    async getOrCreateThread(userId, threadId) {
        try {
            if (threadId) {
                // Verify thread exists and belongs to user
                const { data: existing } = await this.supabase
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
            await this.supabase
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
     */
    async getConversationHistory(threadId) {
        try {
            const { data: thread } = await this.supabase
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
     */
    async saveMessageToThread(threadId, message) {
        try {
            const history = await this.getConversationHistory(threadId);
            history.push(message);
            await this.supabase
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
     */
    async chat(message, userId, options = {}) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                return {
                    success: false,
                    error: 'AI service is not configured. Please set OPENAI_API_KEY.',
                };
            }
            // Get or create thread
            const threadId = await this.getOrCreateThread(userId, options.threadId);
            // Get user context (anonymized)
            const userContext = await getUserContext(userId);
            // Override with provided options
            const context = {
                ...userContext,
                role: options.role || userContext.role,
                familySize: options.familySize || userContext.familySize,
                budget: options.budget,
                threadId,
            };
            // Fetch products from database
            const products = await this.getProductsForRAG(context);
            const productContext = this.buildProductContext(products, 80);
            // Get conversation history
            const history = await this.getConversationHistory(threadId);
            const historyMessages = history.slice(-6).map(h => h.role === 'user'
                ? new messages_1.HumanMessage(h.content)
                : new messages_1.AIMessage(h.content));
            // Build system prompt
            const systemPrompt = `You are Grovio AI, an intelligent grocery shopping assistant for Ghanaian shoppers. All prices are in Ghanaian Cedis (₵).

**Your Capabilities:**
- Provide personalized grocery recommendations based on budget, family size, and preferences
- Suggest meal plans and recipes using available products
- Help users maximize value within their budget
- Understand Ghanaian cuisine and shopping patterns

**Context:**
- User Profile: ${context.role || 'customer'} | Family Size: ${context.familySize || 1}
- Budget: ${context.budget ? `₵${context.budget}` : 'Not specified'}
- Dietary Restrictions: ${context.dietary_restrictions?.join(', ') || 'None'}
- Preferred Categories: ${context.preferred_categories?.join(', ') || 'None'}

**Available Products:**
${productContext}

**Rules:**
1. ONLY recommend products from the catalog above
2. Stay within budget if specified (±5% tolerance)
3. Prioritize: Staples (rice, flour, oil) → Proteins → Vegetables → Others
4. Consider family size when suggesting quantities
5. Respect dietary restrictions
6. Use ₵ symbol for all prices
7. Format important text with **bold** for emphasis
8. Keep recommendations practical and culturally appropriate
9. When appropriate, suggest meal ideas with the recommended items

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
     */
    async getRecommendations(context) {
        try {
            // Get user's full context
            const userContext = await this.getUserContext(context.userId);
            const fullContext = { ...userContext, ...context };
            // Fetch products from database
            const products = await this.getProductsForRAG(fullContext);
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
     */
    async searchProducts(query, userId, limit = 10) {
        try {
            const userContext = await this.getUserContext(userId);
            // Database search with full-text and similarity
            const searchQuery = `%${query.toLowerCase()}%`;
            const { data: products, error } = await this.supabase
                .from('products')
                .select('*')
                .or(`name.ilike.${searchQuery},description.ilike.${searchQuery},category_name.ilike.${searchQuery},subcategory.ilike.${searchQuery},brand.ilike.${searchQuery}`)
                .eq('in_stock', true)
                .order('rating', { ascending: false })
                .limit(limit);
            if (error) {
                return {
                    success: false,
                    error: error.message,
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
     */
    async analyzeBudget(budget, familySize, duration, userId) {
        try {
            const userContext = await this.getUserContext(userId);
            // Fetch products for context
            const products = await this.getProductsForRAG(userContext);
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
     */
    async getMealSuggestions(ingredients, mealType, dietaryRestrictions, familySize, userId) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                return {
                    success: false,
                    error: 'AI service is not configured',
                };
            }
            const userContext = await this.getUserContext(userId);
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
     */
    async cleanupOldThreads(olderThanDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            await this.supabase
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
async function getUserContext(userId) {
    try {
        const supabase = (0, supabase_1.createClient)();
        const { data: preferences } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();
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
