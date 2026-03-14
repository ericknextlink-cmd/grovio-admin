"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryController = void 0;
const delivery_service_1 = require("../services/delivery.service");
const deliveryService = new delivery_service_1.DeliveryService();
class DeliveryController {
    constructor() {
        /** GET /api/delivery/calculate?lat=&lng= - returns delivery fee (auth required) */
        this.calculate = async (req, res) => {
            try {
                const lat = parseFloat(String(req.query.lat));
                const lng = parseFloat(String(req.query.lng));
                if (Number.isNaN(lat) || Number.isNaN(lng)) {
                    res.status(400).json({
                        success: false,
                        message: 'lat and lng query parameters are required',
                        data: { deliveryFee: 0 },
                    });
                    return;
                }
                const result = await deliveryService.calculateFee(lat, lng);
                res.json({
                    success: true,
                    data: {
                        deliveryFee: result.deliveryFee,
                        ...(result.distanceKm != null && { distanceKm: result.distanceKm }),
                    },
                });
            }
            catch (err) {
                console.error('Delivery calculate error:', err);
                res.status(500).json({
                    success: false,
                    message: 'Failed to calculate delivery fee',
                    data: { deliveryFee: 0 },
                });
            }
        };
        /** GET /api/delivery/settings - admin only */
        this.getSettings = async (_req, res) => {
            try {
                const settings = await deliveryService.getSettings();
                res.json({
                    success: true,
                    data: settings ?? {
                        warehouseLat: null,
                        warehouseLng: null,
                        warehouseAddress: null,
                        pricePerKm: 0,
                        pricePerMeter: null,
                        updatedAt: null,
                    },
                });
            }
            catch (err) {
                console.error('Delivery getSettings error:', err);
                res.status(500).json({ success: false, message: 'Failed to load delivery settings' });
            }
        };
        /** PUT /api/delivery/settings - admin only */
        this.updateSettings = async (req, res) => {
            try {
                const body = req.body || {};
                const result = await deliveryService.updateSettings({
                    warehouseLat: body.warehouseLat ?? body.warehouse_lat,
                    warehouseLng: body.warehouseLng ?? body.warehouse_lng,
                    warehouseAddress: body.warehouseAddress ?? body.warehouse_address,
                    pricePerKm: body.pricePerKm ?? body.price_per_km,
                    pricePerMeter: body.pricePerMeter ?? body.price_per_meter,
                });
                if (!result.success) {
                    res.status(400).json({ success: false, message: result.error ?? 'Update failed' });
                    return;
                }
                const settings = await deliveryService.getSettings();
                res.json({ success: true, data: settings });
            }
            catch (err) {
                console.error('Delivery updateSettings error:', err);
                res.status(500).json({ success: false, message: 'Failed to update delivery settings' });
            }
        };
    }
}
exports.DeliveryController = DeliveryController;
