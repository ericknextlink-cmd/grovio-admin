import { products } from "../products"
import type { Product } from "../types"

// Lightweight helpers for budget recommendations without network calls

export type UserContext = {
  role?: "student" | "parent" | "mother" | "father" | string
  familySize?: number
  budget?: number
}

export type Recommendation = {
  items: Array<{ product: Product; quantity: number; subtotal: number }>
  total: number
  rationale: string
}

export function getBudgetBundle(ctx: UserContext): Recommendation {
  const budget = Math.max(0, ctx.budget ?? 0)

  // Prioritize staples and proteins first
  const priorityOrder = [
    "grains",
    "flour",
    "oils",
    "cereals",
    "meat",
    "vegetables",
    "seasonings",
    "pasta",
    "canned",
    "beverages",
  ]

  const sorted = [...products].sort((a, b) => {
    const ai = priorityOrder.indexOf(a.category)
    const bi = priorityOrder.indexOf(b.category)
    if (ai !== bi) return ai - bi
    return a.price - b.price
  })

  const items: Recommendation["items"] = []
  let remaining = budget

  for (const p of sorted) {
    if (remaining <= 0) break
    // Choose a sensible quantity: more of cheap staples; single units for pricier items
    const unit = p.price
    if (unit <= 0) continue
    const maxQty = Math.max(0, Math.floor(remaining / unit))
    if (maxQty <= 0) continue

    const qty = Math.min(maxQty, unit <= 10 ? 2 : 1)
    const subtotal = qty * unit
    items.push({ product: p, quantity: qty, subtotal })
    remaining -= subtotal
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0)
  const role = ctx.role ?? "user"
  const size = ctx.familySize ?? 1
  const rationale = `Optimized a budget-friendly basket for a ${role} (family size ${size}). Prioritized staples (rice/flour/oil), affordable proteins, and fresh produce, then filled remaining budget with essentials.`

  return { items, total, rationale }
}

// Simple search/filter utility used for RAG grounding
export function findProductsByQuery(query: string): Product[] {
  const q = query.toLowerCase()
  return products.filter((p) =>
    [p.name, p.description, p.category, p.subcategory, p.brand]
      .filter(Boolean)
      .some((v) => (v as string).toLowerCase().includes(q))
  )
}


