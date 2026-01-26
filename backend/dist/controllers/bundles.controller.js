"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundlesController = void 0;
const ai_bundles_service_1 = require("../services/ai-bundles.service");
class BundlesController {
    constructor() {
        /**
         * Get all product bundles
         */
        this.getBundles = async (req, res) => {
            try {
                const { category, limit, offset } = req.query;
                const result = await this.bundlesService.getBundles({
                    category: category,
                    limit: limit ? parseInt(limit, 10) : 20,
                    offset: offset ? parseInt(offset, 10) : 0,
                });
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Bundles retrieved successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Failed to get bundles',
                        errors: [result.error || 'Fetch failed'],
                    });
                }
            }
            catch (error) {
                console.error('Get bundles controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to get bundles'],
                });
            }
        };
        /**
         * Get personalized bundles for authenticated user
         */
        this.getPersonalizedBundles = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    // Return general bundles for anonymous users
                    return this.getBundles(req, res);
                }
                const result = await this.bundlesService.getPersonalizedBundles(userId);
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Personalized bundles retrieved successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Failed to get personalized bundles',
                        errors: [result.error || 'Fetch failed'],
                    });
                }
            }
            catch (error) {
                console.error('Get personalized bundles controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to get personalized bundles'],
                });
            }
        };
        /**
         * Get bundle by ID
         */
        this.getBundleById = async (req, res) => {
            try {
                const { bundleId } = req.params;
                const id = Array.isArray(bundleId) ? bundleId[0] : bundleId;
                const result = await this.bundlesService.getBundleById(id);
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Bundle retrieved successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(404).json({
                        success: false,
                        message: result.error || 'Bundle not found',
                        errors: [result.error || 'Not found'],
                    });
                }
            }
            catch (error) {
                console.error('Get bundle by ID controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to get bundle'],
                });
            }
        };
        /**
         * Generate new bundles (Admin only)
         */
        this.generateBundles = async (req, res) => {
            try {
                const { count = 20 } = req.body;
                const result = await this.bundlesService.generateBundles(count);
                if (result.success && result.bundles) {
                    // Save bundles to database
                    let savedCount = 0;
                    for (const bundle of result.bundles) {
                        const saveResult = await this.bundlesService.saveBundle(bundle);
                        if (saveResult.success) {
                            savedCount++;
                        }
                    }
                    res.json({
                        success: true,
                        message: `Generated and saved ${savedCount} bundles successfully`,
                        data: {
                            generated: result.bundles.length,
                            saved: savedCount,
                            bundles: result.bundles,
                        },
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Failed to generate bundles',
                        errors: [result.error || 'Generation failed'],
                    });
                }
            }
            catch (error) {
                console.error('Generate bundles controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to generate bundles'],
                });
            }
        };
        /**
         * Refresh all bundles (Admin only)
         */
        this.refreshBundles = async (req, res) => {
            try {
                const result = await this.bundlesService.refreshBundles();
                if (result.success) {
                    res.json({
                        success: true,
                        message: `Bundles refreshed successfully. ${result.count} new bundles created.`,
                        data: {
                            count: result.count,
                        },
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: result.error || 'Failed to refresh bundles',
                        errors: [result.error || 'Refresh failed'],
                    });
                }
            }
            catch (error) {
                console.error('Refresh bundles controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to refresh bundles'],
                });
            }
        };
        this.bundlesService = new ai_bundles_service_1.AIBundlesService();
    }
}
exports.BundlesController = BundlesController;
