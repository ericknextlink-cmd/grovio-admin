import { createAdminClient } from '../config/supabase'

const DEFAULT_SETTINGS_ID = 'a0000000-0000-0000-0000-000000000001'

/** Haversine distance in km between two lat/lng points */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface DeliverySettings {
  warehouseLat: number | null
  warehouseLng: number | null
  warehouseAddress: string | null
  pricePerKm: number
  pricePerMeter: number | null
  updatedAt: string | null
}

export interface DeliverySettingsRow {
  warehouse_lat: number | null
  warehouse_lng: number | null
  warehouse_address: string | null
  price_per_km: number
  price_per_meter: number | null
  updated_at: string | null
}

function rowToSettings(row: DeliverySettingsRow | null): DeliverySettings | null {
  if (!row) return null
  return {
    warehouseLat: row.warehouse_lat ?? null,
    warehouseLng: row.warehouse_lng ?? null,
    warehouseAddress: row.warehouse_address ?? null,
    pricePerKm: Number(row.price_per_km) || 0,
    pricePerMeter: row.price_per_meter != null ? Number(row.price_per_meter) : null,
    updatedAt: row.updated_at ?? null,
  }
}

export class DeliveryService {
  private supabase = createAdminClient()

  async getSettings(): Promise<DeliverySettings | null> {
    const { data, error } = await this.supabase
      .from('delivery_settings')
      .select('warehouse_lat, warehouse_lng, warehouse_address, price_per_km, price_per_meter, updated_at')
      .eq('id', DEFAULT_SETTINGS_ID)
      .maybeSingle()

    if (error) {
      console.warn('DeliveryService getSettings error:', error.message)
      return null
    }
    return rowToSettings(data as DeliverySettingsRow | null)
  }

  async updateSettings(params: {
    warehouseLat?: number | null
    warehouseLng?: number | null
    warehouseAddress?: string | null
    pricePerKm?: number
    pricePerMeter?: number | null
  }): Promise<{ success: boolean; error?: string }> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (params.warehouseLat !== undefined) updates.warehouse_lat = params.warehouseLat
    if (params.warehouseLng !== undefined) updates.warehouse_lng = params.warehouseLng
    if (params.warehouseAddress !== undefined) updates.warehouse_address = params.warehouseAddress
    if (params.pricePerKm !== undefined) updates.price_per_km = params.pricePerKm
    if (params.pricePerMeter !== undefined) updates.price_per_meter = params.pricePerMeter

    const { error } = await this.supabase
      .from('delivery_settings')
      .update(updates)
      .eq('id', DEFAULT_SETTINGS_ID)

    if (error) {
      console.warn('DeliveryService updateSettings error:', error.message)
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  /** Default delivery fee (GHS) when warehouse location is not set in admin. */
  static readonly DEFAULT_DELIVERY_FEE = 20

  /**
   * Calculate delivery fee (GHS) from customer lat/lng using warehouse location and price_per_km.
   * When warehouse is not set, returns DEFAULT_DELIVERY_FEE (20 GHS).
   */
  async calculateFee(customerLat: number, customerLng: number): Promise<{ deliveryFee: number; distanceKm?: number }> {
    const settings = await this.getSettings()
    if (!settings || settings.warehouseLat == null || settings.warehouseLng == null) {
      return { deliveryFee: DeliveryService.DEFAULT_DELIVERY_FEE }
    }
    const distanceKm = haversineKm(
      settings.warehouseLat,
      settings.warehouseLng,
      customerLat,
      customerLng
    )
    const pricePerKm = Math.max(0, Number(settings.pricePerKm) || 0)
    const deliveryFee = Math.round(distanceKm * pricePerKm * 100) / 100
    return { deliveryFee, distanceKm }
  }
}
