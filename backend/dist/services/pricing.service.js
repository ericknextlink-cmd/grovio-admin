"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const supabase_1 = require("../config/supabase");
const products_service_1 = require("./products.service");
/** Default price ranges (by original_price). Percentages are set on the pricing page and sent on Apply. */
const DEFAULT_RANGES = [
    { id: '0-10', min_value: 0, max_value: 10, label: '0 - 10' },
    { id: '10-50', min_value: 10, max_value: 50, label: '10 - 50' },
    { id: '50-100', min_value: 50, max_value: 100, label: '50 - 100' },
    { id: '100-500', min_value: 100, max_value: 500, label: '100 - 500' },
    { id: '500+', min_value: 500, max_value: 999999, label: '500+' }
];
class PricingService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
        this.productsService = new products_service_1.ProductsService();
    }
    /**
     * Get price ranges with optional product counts. Percentages are not persisted; frontend sends them on Apply.
     */
    async getRanges() {
        const products = await this.productsService.getAllForPricing();
        return DEFAULT_RANGES.map((r) => {
            const costKey = (p) => p.original_price ?? p.price;
            const product_count = products.filter((p) => costKey(p) >= r.min_value && costKey(p) < r.max_value).length;
            return {
                ...r,
                percentage: 0,
                product_count
            };
        });
    }
    /**
     * Apply markup by range: for each product, find its range by original_price (or price), then set price = original_price * (1 + percentage/100).
     */
    async applyPricing(ranges) {
        const products = await this.productsService.getAllForPricing();
        let updated = 0;
        for (const product of products) {
            const cost = product.original_price ?? product.price;
            const range = ranges.find((r) => cost >= r.min_value && cost < r.max_value);
            if (!range || range.percentage === 0)
                continue;
            const newPrice = Math.round(cost * (1 + range.percentage / 100) * 100) / 100;
            await this.productsService.updateProductPrice(product.id, newPrice);
            updated++;
        }
        return { updated };
    }
}
exports.PricingService = PricingService;
