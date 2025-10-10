import type { Product } from "./types"
import { sampleProducts } from "./data"

// Re-export the mock products under a clear name for AI/RAG usage
export const products: Product[] = sampleProducts

export type { Product }


