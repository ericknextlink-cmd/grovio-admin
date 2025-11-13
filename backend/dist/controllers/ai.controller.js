"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const ai_enhanced_service_1 = require("../services/ai-enhanced.service");
const supabase_1 = require("../config/supabase");
class AIController {
    constructor() {
        /**
         * Enhanced AI chat with thread support and RAG
         */
        this.getChatResponse = async (req, res) => {
            try {
                const { message, role, familySize, budget, threadId } = req.body;
                const userId = req.user?.id;
                if (!message || typeof message !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Message is required and must be a string',
                        errors: ['Invalid message format']
                    });
                    return;
                }
                // User ID is optional - anonymous users can also use AI
                const effectiveUserId = userId || 'anonymous';
                // Extract user token from Authorization header for RLS compliance
                const authHeader = req.headers.authorization;
                const userToken = authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.substring(7)
                    : undefined;
                const result = await this.aiService.chat(message, effectiveUserId, {
                    role,
                    familySize,
                    budget,
                    threadId,
                    userToken, // Pass token to respect RLS policies
                });
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'AI response generated successfully',
                        data: {
                            message: result.message,
                            threadId: result.threadId,
                        },
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Failed to generate AI response',
                        errors: [result.error || 'AI service error'],
                    });
                }
            }
            catch (error) {
                console.error('AI chat response error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong'],
                });
            }
        };
        /**
         * Enhanced product recommendations with database RAG
         */
        this.getRecommendations = async (req, res) => {
            try {
                const { budget, familySize = 1, role, preferences = [], categories = [] } = req.body;
                const userId = req.user?.id || 'anonymous';
                if (!budget || typeof budget !== 'number' || budget <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Budget is required and must be a positive number',
                        errors: ['Invalid budget value']
                    });
                    return;
                }
                // Extract user token from Authorization header for RLS compliance
                const authHeader = req.headers.authorization;
                const userToken = authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.substring(7)
                    : undefined;
                const result = await this.aiService.getRecommendations({
                    userId,
                    budget,
                    familySize,
                    role,
                    preferences,
                    preferred_categories: categories,
                }, userToken); // Pass token to respect RLS policies
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Recommendations generated successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Failed to generate recommendations',
                        errors: [result.error || 'Recommendation error'],
                    });
                }
            }
            catch (error) {
                console.error('AI recommendations error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong'],
                });
            }
        };
        /**
         * Enhanced AI-powered product search
         */
        this.searchProducts = async (req, res) => {
            try {
                const { query, limit = 10 } = req.query;
                const userId = req.user?.id || 'anonymous';
                if (!query || typeof query !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Search query is required',
                        errors: ['Missing or invalid query parameter']
                    });
                    return;
                }
                // Extract user token from Authorization header for RLS compliance
                const authHeader = req.headers.authorization;
                const userToken = authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.substring(7)
                    : undefined;
                const result = await this.aiService.searchProducts(query, userId, parseInt(limit, 10), userToken // Pass token to respect RLS policies
                );
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Product search completed successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Search failed',
                        errors: [result.error || 'Search error'],
                    });
                }
            }
            catch (error) {
                console.error('AI product search error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong'],
                });
            }
        };
        /**
         * Enhanced budget analysis with AI insights
         */
        this.getBudgetAnalysis = async (req, res) => {
            try {
                const { budget, familySize = 1, duration = 'week' } = req.body;
                const userId = req.user?.id || 'anonymous';
                if (!budget || typeof budget !== 'number' || budget <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Budget is required and must be a positive number',
                        errors: ['Invalid budget value']
                    });
                    return;
                }
                if (!['day', 'week', 'month'].includes(duration)) {
                    res.status(400).json({
                        success: false,
                        message: 'Duration must be one of: day, week, month',
                        errors: ['Invalid duration']
                    });
                    return;
                }
                // Extract user token from Authorization header for RLS compliance
                const authHeader = req.headers.authorization;
                const userToken = authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.substring(7)
                    : undefined;
                const result = await this.aiService.analyzeBudget(budget, familySize, duration, userId, userToken // Pass token to respect RLS policies
                );
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Budget analysis completed successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Analysis failed',
                        errors: [result.error || 'Analysis error'],
                    });
                }
            }
            catch (error) {
                console.error('AI budget analysis error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong'],
                });
            }
        };
        /**
         * Enhanced meal suggestions with cultural context
         */
        this.getMealSuggestions = async (req, res) => {
            try {
                const { ingredients = [], mealType = 'any', dietaryRestrictions = [], familySize = 1 } = req.body;
                const userId = req.user?.id || 'anonymous';
                // Extract user token from Authorization header for RLS compliance
                const authHeader = req.headers.authorization;
                const userToken = authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.substring(7)
                    : undefined;
                const result = await this.aiService.getMealSuggestions(ingredients, mealType, dietaryRestrictions, familySize, userId, userToken // Pass token to respect RLS policies
                );
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Meal suggestions generated successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Failed to generate meal suggestions',
                        errors: [result.error || 'Meal suggestion error'],
                    });
                }
            }
            catch (error) {
                console.error('AI meal suggestions error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong'],
                });
            }
        };
        /**
         * Get user's conversation history
         */
        this.getConversationHistory = async (req, res) => {
            try {
                const { threadId } = req.params;
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required',
                        errors: ['Please sign in to view conversation history'],
                    });
                    return;
                }
                if (!threadId) {
                    res.status(400).json({
                        success: false,
                        message: 'Thread ID is required',
                        errors: ['Missing thread ID'],
                    });
                    return;
                }
                // Use admin client to access threads (respects user_id filter for security)
                const adminSupabase = (0, supabase_1.createAdminClient)();
                const { data: thread, error } = await adminSupabase
                    .from('ai_conversation_threads')
                    .select('*')
                    .eq('thread_id', threadId)
                    .eq('user_id', userId)
                    .single();
                if (error || !thread) {
                    res.status(404).json({
                        success: false,
                        message: 'Conversation thread not found',
                        errors: ['Thread does not exist or access denied'],
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Conversation history retrieved successfully',
                    data: {
                        threadId: thread.thread_id,
                        messages: thread.messages,
                        createdAt: thread.created_at,
                        updatedAt: thread.updated_at,
                    },
                });
            }
            catch (error) {
                console.error('Get conversation history error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to retrieve history'],
                });
            }
        };
        /**
         * Get all user's conversation threads
         */
        this.getUserThreads = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required',
                        errors: ['Please sign in to view threads'],
                    });
                    return;
                }
                // Use admin client to access threads (respects user_id filter for security)
                const adminSupabase = (0, supabase_1.createAdminClient)();
                const { data: threads, error } = await adminSupabase
                    .from('ai_conversation_threads')
                    .select('thread_id, context, created_at, updated_at')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false })
                    .limit(50);
                if (error) {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to fetch threads',
                        errors: [error.message],
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Conversation threads retrieved successfully',
                    data: threads || [],
                });
            }
            catch (error) {
                console.error('Get user threads error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to retrieve threads'],
                });
            }
        };
        /**
         * Delete a conversation thread
         */
        this.deleteThread = async (req, res) => {
            try {
                const { threadId } = req.params;
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required',
                        errors: ['Please sign in'],
                    });
                    return;
                }
                // Use admin client to delete thread (respects user_id filter for security)
                const adminSupabase = (0, supabase_1.createAdminClient)();
                const { error } = await adminSupabase
                    .from('ai_conversation_threads')
                    .delete()
                    .eq('thread_id', threadId)
                    .eq('user_id', userId);
                if (error) {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to delete thread',
                        errors: [error.message],
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Conversation thread deleted successfully',
                });
            }
            catch (error) {
                console.error('Delete thread error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to delete thread'],
                });
            }
        };
        this.aiService = new ai_enhanced_service_1.AIEnhancedService();
    }
}
exports.AIController = AIController;
