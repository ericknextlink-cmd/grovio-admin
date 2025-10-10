"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const ai_service_1 = require("../services/ai.service");
class AIController {
    constructor() {
        /**
         * Get AI chat response
         */
        this.getChatResponse = async (req, res) => {
            try {
                const { message, role, familySize, budget } = req.body;
                if (!message || typeof message !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Message is required and must be a string'
                    });
                    return;
                }
                const response = await this.aiService.generateChatResponse({
                    message,
                    role,
                    familySize,
                    budget
                });
                res.json({
                    success: true,
                    message: 'AI response generated successfully',
                    data: { message: response }
                });
            }
            catch (error) {
                console.error('AI chat response error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get product recommendations
         */
        this.getRecommendations = async (req, res) => {
            try {
                const { budget, familySize = 1, role = 'user', preferences = [], categories = [] } = req.body;
                if (!budget || typeof budget !== 'number' || budget <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Budget is required and must be a positive number'
                    });
                    return;
                }
                const recommendations = await this.aiService.generateRecommendations({
                    budget,
                    familySize,
                    role,
                    preferences,
                    categories
                });
                res.json({
                    success: true,
                    message: 'Recommendations generated successfully',
                    data: recommendations
                });
            }
            catch (error) {
                console.error('AI recommendations error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Search products with AI
         */
        this.searchProducts = async (req, res) => {
            try {
                const { query, limit = 10 } = req.query;
                if (!query || typeof query !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Search query is required'
                    });
                    return;
                }
                const results = await this.aiService.searchProducts(query, parseInt(limit));
                res.json({
                    success: true,
                    message: 'Product search completed successfully',
                    data: results
                });
            }
            catch (error) {
                console.error('AI product search error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get budget analysis
         */
        this.getBudgetAnalysis = async (req, res) => {
            try {
                const { budget, familySize = 1, duration = 'week' } = req.body;
                if (!budget || typeof budget !== 'number' || budget <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Budget is required and must be a positive number'
                    });
                    return;
                }
                const analysis = await this.aiService.analyzeBudget({
                    budget,
                    familySize,
                    duration
                });
                res.json({
                    success: true,
                    message: 'Budget analysis completed successfully',
                    data: analysis
                });
            }
            catch (error) {
                console.error('AI budget analysis error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get meal suggestions
         */
        this.getMealSuggestions = async (req, res) => {
            try {
                const { ingredients = [], mealType = 'any', dietaryRestrictions = [], familySize = 1 } = req.body;
                const suggestions = await this.aiService.generateMealSuggestions({
                    ingredients,
                    mealType,
                    dietaryRestrictions,
                    familySize
                });
                res.json({
                    success: true,
                    message: 'Meal suggestions generated successfully',
                    data: suggestions
                });
            }
            catch (error) {
                console.error('AI meal suggestions error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        this.aiService = new ai_service_1.AIService();
    }
}
exports.AIController = AIController;
