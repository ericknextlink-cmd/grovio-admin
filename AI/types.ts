export interface User {
  id: string
  fullName: string
  username: string
  email: string
  phoneNumber: string
  countryCode: string
}

export interface Product {
  id: string
  slug?: string
  name: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  category: string
  subcategory?: string
  brand?: string
  specifications: {
    size?: string
    quantity?: string
    weight?: string
    type?: string
    packaging?: string
  }
  inStock: boolean
  rating: number
  reviews: number
}

export interface Category {
  id: string
  slug?: string
  name: string
  icon: string
  subcategories?: string[]
}

export interface CartItem {
  product: Product
  quantity: number
  selectedSpecs?: Record<string, string>
}
