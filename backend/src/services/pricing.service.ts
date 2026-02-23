import { createAdminClient } from '../config/supabase'
import { ProductsService } from './products.service'

export interface PriceRange {
  id: string
  min_value: number
  max_value: number
  label: string
  percentage: number
  product_count?: number
}

/** Default price ranges (by original_price). Percentages are set on the pricing page and sent on Apply. */
const DEFAULT_RANGES: Omit<PriceRange, 'percentage' | 'product_count'>[] = [
  { id: '0-10', min_value: 0, max_value: 10, label: '0 - 10' },
  { id: '10-50', min_value: 10, max_value: 50, label: '10 - 50' },
  { id: '50-100', min_value: 50, max_value: 100, label: '50 - 100' },
  { id: '100-500', min_value: 100, max_value: 500, label: '100 - 500' },
  { id: '500+', min_value: 500, max_value: 999999, label: '500+' }
]

export interface ApplyRangeInput {
  min_value: number
  max_value: number
  percentage: number
}

export class PricingService {
  private supabase = createAdminClient()
  private productsService = new ProductsService()

  /**
   * Get price ranges with optional product counts. Percentages are not persisted; frontend sends them on Apply.
   */
  async getRanges(): Promise<PriceRange[]> {
    const products = await this.productsService.getAllForPricing()
    return DEFAULT_RANGES.map((r) => {
      const costKey = (p: { original_price: number | null; price: number }) =>
        p.original_price ?? p.price
      const product_count = products.filter(
        (p) => costKey(p) >= r.min_value && costKey(p) < r.max_value
      ).length
      return {
        ...r,
        percentage: 0,
        product_count
      }
    })
  }

  /**
   * Apply markup by range: for each product, find its range by original_price (or price), then set price = original_price * (1 + percentage/100).
   */
  async applyPricing(ranges: ApplyRangeInput[]): Promise<{ updated: number }> {
    const products = await this.productsService.getAllForPricing()
    let updated = 0
    for (const product of products) {
      const cost = product.original_price ?? product.price
      const range = ranges.find((r) => cost >= r.min_value && cost < r.max_value)
      if (!range || range.percentage === 0) continue
      const newPrice = Math.round(cost * (1 + range.percentage / 100) * 100) / 100
      await this.productsService.updateProductPrice(product.id, newPrice)
      updated++
    }
    return { updated }
  }
}
