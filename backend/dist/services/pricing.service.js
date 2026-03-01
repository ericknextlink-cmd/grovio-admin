"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const supabase_1 = require("../config/supabase");
const products_service_1 = require("./products.service");
/** Default price ranges (by original_price). Percentages persisted in pricing_range_settings. */
const DEFAULT_RANGES = [
    { id: '0-10', min_value: 0, max_value: 10, label: '0 - 10' },
    { id: '10-50', min_value: 10, max_value: 50, label: '10 - 50' },
    { id: '50-100', min_value: 50, max_value: 100, label: '50 - 100' },
    { id: '100-500', min_value: 100, max_value: 500, label: '100 - 500' },
    { id: '500+', min_value: 500, max_value: 999999, label: '500+' }
];
function getCost(p) {
    const raw = p.original_price ?? p.price;
    const n = Number(raw);
    return typeof n === 'number' && !Number.isNaN(n) && n >= 0 ? n : null;
}
class PricingService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
        this.productsService = new products_service_1.ProductsService();
    }
    /**
     * Get price ranges with product counts and persisted percentages from DB.
     * Run supabase-pricing-range-settings.sql once to create the table.
     * Returns ranges and total_products so the UI can verify counts sum correctly.
     */
    async getRanges() {
        const products = await this.productsService.getAllForPricing();
        const total_products = products.length;
        const rangeIds = DEFAULT_RANGES.map((r) => r.id);
        let storedPercentages = {};
        try {
            const { data: rows } = await this.supabase
                .from('pricing_range_settings')
                .select('range_id, percentage')
                .in('range_id', rangeIds);
            if (rows?.length) {
                storedPercentages = Object.fromEntries(rows.map((r) => [r.range_id, Number(r.percentage) || 0]));
            }
        }
        catch {
            // Table may not exist yet; use 0 for all
        }
        const ranges = DEFAULT_RANGES.map((r) => {
            const product_count = products.filter((p) => {
                const cost = getCost(p);
                if (cost === null)
                    return false;
                return cost >= r.min_value && cost < r.max_value;
            }).length;
            return {
                ...r,
                percentage: storedPercentages[r.id] ?? 0,
                product_count
            };
        });
        return { ranges, total_products };
    }
    /**
     * Apply markup by range: update product prices, then persist percentages to DB.
     */
    async applyPricing(ranges) {
        const products = await this.productsService.getAllForPricing();
        let updated = 0;
        for (const product of products) {
            const cost = getCost(product);
            if (cost === null)
                continue;
            const range = ranges.find((r) => cost >= r.min_value && cost < r.max_value);
            if (!range || range.percentage === 0)
                continue;
            const newPrice = Math.round(cost * (1 + range.percentage / 100) * 100) / 100;
            await this.productsService.updateProductPrice(product.id, newPrice);
            updated++;
        }
        // Persist percentages to DB so they load on refresh
        for (const r of ranges) {
            const def = DEFAULT_RANGES.find((d) => d.min_value === r.min_value && d.max_value === r.max_value);
            const rangeId = def?.id ?? `${r.min_value}-${r.max_value}`;
            try {
                await this.supabase
                    .from('pricing_range_settings')
                    .upsert({ range_id: rangeId, percentage: r.percentage, updated_at: new Date().toISOString() }, { onConflict: 'range_id' });
            }
            catch (e) {
                console.warn('Could not persist pricing percentage for', rangeId, e);
            }
        }
        return { updated };
    }
    /**
     * Apply discount by range: for products whose original_price falls in each range,
     * set selling price = current price * (1 - discountPercentage/100).
     * Same ranges as markup; discount percentage is 0–100 (e.g. 10 = 10% off).
     */
    async applyDiscounts(ranges) {
        const products = await this.productsService.getAllForPricing();
        let updated = 0;
        for (const product of products) {
            const cost = getCost(product);
            if (cost === null)
                continue;
            const range = ranges.find((r) => cost >= r.min_value && cost < r.max_value);
            if (!range || range.percentage === 0)
                continue;
            const currentPrice = Number(product.price) || 0;
            if (currentPrice <= 0)
                continue;
            const newPrice = Math.round(currentPrice * (1 - range.percentage / 100) * 100) / 100;
            await this.productsService.updateProductPrice(product.id, newPrice);
            updated++;
        }
        return { updated };
    }
    /**
     * Apply a single markup % to all bundles. For each bundle: sum products' original_price (supplier),
     * then bundle current_price = sum * (1 + percentage/100). No per-product markup; one markup on bundle total.
     */
    async applyBundleMarkup(percentage) {
        const pct = Number(percentage);
        if (Number.isNaN(pct) || pct < 0)
            return { updated: 0 };
        const { data: bundles } = await this.supabase
            .from('ai_product_bundles')
            .select('id, bundle_id, product_ids')
            .eq('is_active', true);
        if (!bundles?.length)
            return { updated: 0 };
        const productIds = new Set();
        for (const b of bundles) {
            const ids = b.product_ids ?? [];
            ids.forEach((id) => productIds.add(id));
        }
        const { data: productRows } = await this.supabase
            .from('products')
            .select('id, original_price, price')
            .in('id', Array.from(productIds));
        const priceByProductId = new Map();
        for (const row of productRows ?? []) {
            const cost = row.original_price ?? row.price;
            const n = Number(cost);
            priceByProductId.set(row.id, Number.isNaN(n) || n < 0 ? 0 : n);
        }
        let updated = 0;
        for (const bundle of bundles) {
            const ids = bundle.product_ids ?? [];
            const totalOriginal = ids.reduce((sum, id) => sum + (priceByProductId.get(id) ?? 0), 0);
            const newCurrentPrice = Math.round(totalOriginal * (1 + pct / 100) * 100) / 100;
            const { error } = await this.supabase
                .from('ai_product_bundles')
                .update({
                original_price: totalOriginal,
                current_price: newCurrentPrice,
                savings: 0,
                discount_percentage: 0,
                updated_at: new Date().toISOString()
            })
                .eq('id', bundle.id);
            if (!error)
                updated++;
        }
        return { updated };
    }
}
exports.PricingService = PricingService;
