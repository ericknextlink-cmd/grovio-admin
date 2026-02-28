"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingController = void 0;
const pricing_service_1 = require("../services/pricing.service");
class PricingController {
    constructor() {
        this.pricingService = new pricing_service_1.PricingService();
        this.getRanges = async (req, res) => {
            try {
                const { ranges, total_products } = await this.pricingService.getRanges();
                res.json({
                    success: true,
                    message: 'Price ranges retrieved',
                    data: { ranges, total_products }
                });
            }
            catch (error) {
                console.error('Get pricing ranges error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to load price ranges'
                });
            }
        };
        this.applyPricing = async (req, res) => {
            try {
                const { ranges } = req.body;
                if (!Array.isArray(ranges) || ranges.length === 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Request body must include ranges array with min_value, max_value, percentage'
                    });
                    return;
                }
                const result = await this.pricingService.applyPricing(ranges);
                res.json({
                    success: true,
                    message: `Pricing applied. ${result.updated} product(s) updated.`,
                    data: result
                });
            }
            catch (error) {
                console.error('Apply pricing error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to apply pricing'
                });
            }
        };
    }
}
exports.PricingController = PricingController;
