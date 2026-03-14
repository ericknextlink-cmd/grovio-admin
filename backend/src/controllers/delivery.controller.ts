import { Response } from 'express'
import { DeliveryService } from '../services/delivery.service'
import { ApiResponse } from '../types/api.types'

const deliveryService = new DeliveryService()

export class DeliveryController {
  /** GET /api/delivery/calculate?lat=&lng= - returns delivery fee (auth required) */
  calculate = async (req: import('express').Request, res: Response): Promise<void> => {
    try {
      const lat = parseFloat(String(req.query.lat))
      const lng = parseFloat(String(req.query.lng))
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        res.status(400).json({
          success: false,
          message: 'lat and lng query parameters are required',
          data: { deliveryFee: 0 },
        } as ApiResponse<{ deliveryFee: number; distanceKm?: number }>)
        return
      }
      const result = await deliveryService.calculateFee(lat, lng)
      res.json({
        success: true,
        data: {
          deliveryFee: result.deliveryFee,
          ...(result.distanceKm != null && { distanceKm: result.distanceKm }),
        },
      })
    } catch (err) {
      console.error('Delivery calculate error:', err)
      res.status(500).json({
        success: false,
        message: 'Failed to calculate delivery fee',
        data: { deliveryFee: 0 },
      } as ApiResponse<{ deliveryFee: number }>)
    }
  }

  /** GET /api/delivery/settings - admin only */
  getSettings = async (_req: import('express').Request, res: Response): Promise<void> => {
    try {
      const settings = await deliveryService.getSettings()
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
      })
    } catch (err) {
      console.error('Delivery getSettings error:', err)
      res.status(500).json({ success: false, message: 'Failed to load delivery settings' })
    }
  }

  /** PUT /api/delivery/settings - admin only */
  updateSettings = async (req: import('express').Request, res: Response): Promise<void> => {
    try {
      const body = req.body || {}
      const result = await deliveryService.updateSettings({
        warehouseLat: body.warehouseLat ?? body.warehouse_lat,
        warehouseLng: body.warehouseLng ?? body.warehouse_lng,
        warehouseAddress: body.warehouseAddress ?? body.warehouse_address,
        pricePerKm: body.pricePerKm ?? body.price_per_km,
        pricePerMeter: body.pricePerMeter ?? body.price_per_meter,
      })
      if (!result.success) {
        res.status(400).json({ success: false, message: result.error ?? 'Update failed' })
        return
      }
      const settings = await deliveryService.getSettings()
      res.json({ success: true, data: settings })
    } catch (err) {
      console.error('Delivery updateSettings error:', err)
      res.status(500).json({ success: false, message: 'Failed to update delivery settings' })
    }
  }
}
