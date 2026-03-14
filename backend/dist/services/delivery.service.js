"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryService = void 0;
const supabase_1 = require("../config/supabase");
const DEFAULT_SETTINGS_ID = 'a0000000-0000-0000-0000-000000000001';
/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function rowToSettings(row) {
    if (!row)
        return null;
    return {
        warehouseLat: row.warehouse_lat ?? null,
        warehouseLng: row.warehouse_lng ?? null,
        warehouseAddress: row.warehouse_address ?? null,
        pricePerKm: Number(row.price_per_km) || 0,
        pricePerMeter: row.price_per_meter != null ? Number(row.price_per_meter) : null,
        updatedAt: row.updated_at ?? null,
    };
}
class DeliveryService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
    }
    async getSettings() {
        const { data, error } = await this.supabase
            .from('delivery_settings')
            .select('warehouse_lat, warehouse_lng, warehouse_address, price_per_km, price_per_meter, updated_at')
            .eq('id', DEFAULT_SETTINGS_ID)
            .maybeSingle();
        if (error) {
            console.warn('DeliveryService getSettings error:', error.message);
            return null;
        }
        return rowToSettings(data);
    }
    async updateSettings(params) {
        const updates = {
            updated_at: new Date().toISOString(),
        };
        if (params.warehouseLat !== undefined)
            updates.warehouse_lat = params.warehouseLat;
        if (params.warehouseLng !== undefined)
            updates.warehouse_lng = params.warehouseLng;
        if (params.warehouseAddress !== undefined)
            updates.warehouse_address = params.warehouseAddress;
        if (params.pricePerKm !== undefined)
            updates.price_per_km = params.pricePerKm;
        if (params.pricePerMeter !== undefined)
            updates.price_per_meter = params.pricePerMeter;
        const { error } = await this.supabase
            .from('delivery_settings')
            .update(updates)
            .eq('id', DEFAULT_SETTINGS_ID);
        if (error) {
            console.warn('DeliveryService updateSettings error:', error.message);
            return { success: false, error: error.message };
        }
        return { success: true };
    }
    /**
     * Calculate delivery fee (GHS) from customer lat/lng using warehouse location and price_per_km.
     * When warehouse is not set, returns DEFAULT_DELIVERY_FEE (20 GHS).
     */
    async calculateFee(customerLat, customerLng) {
        const settings = await this.getSettings();
        if (!settings || settings.warehouseLat == null || settings.warehouseLng == null) {
            return { deliveryFee: DeliveryService.DEFAULT_DELIVERY_FEE };
        }
        const distanceKm = haversineKm(settings.warehouseLat, settings.warehouseLng, customerLat, customerLng);
        const pricePerKm = Math.max(0, Number(settings.pricePerKm) || 0);
        const deliveryFee = Math.round(distanceKm * pricePerKm * 100) / 100;
        return { deliveryFee, distanceKm };
    }
}
exports.DeliveryService = DeliveryService;
/** Default delivery fee (GHS) when warehouse location is not set in admin. */
DeliveryService.DEFAULT_DELIVERY_FEE = 20;
