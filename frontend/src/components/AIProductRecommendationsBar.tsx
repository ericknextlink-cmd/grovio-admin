'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, ShoppingCart, Check, ChevronLeft, ChevronRight } from 'lucide-react'

export interface AIRecommendedProduct {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  category?: string
  deliberationReason?: string
  isInFinalList?: boolean
}

interface AIProductRecommendationsBarProps {
  products: AIRecommendedProduct[]
  aiCart: AIRecommendedProduct[]
  onAddToAICart: (product: AIRecommendedProduct) => void
  onRemoveFromAICart: (productId: string) => void
  onAddToMainCart: () => void
}

export default function AIProductRecommendationsBar({
  products,
  aiCart,
  onAddToAICart,
  onRemoveFromAICart,
  onAddToMainCart
}: AIProductRecommendationsBarProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [showAICart, setShowAICart] = useState(false)

  const scrollLeft = () => {
    setScrollPosition(Math.max(0, scrollPosition - 300))
  }

  const scrollRight = () => {
    setScrollPosition(scrollPosition + 300)
  }

  const isInAICart = (productId: string) => {
    return aiCart.some(item => item.id === productId)
  }

  const finalListProducts = products.filter(p => p.isInFinalList)
  const alternativeProducts = products.filter(p => !p.isInFinalList)

  const totalAICartValue = aiCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  if (products.length === 0) return null

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              AI
            </span>
            Recommended Products
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {finalListProducts.length} in final recommendation • {alternativeProducts.length} alternatives
          </p>
        </div>
        
        {/* AI Cart Summary */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAICart(!showAICart)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              aiCart.length > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="font-medium">{aiCart.length} items</span>
            {aiCart.length > 0 && (
              <span className="text-sm opacity-90">(₵{totalAICartValue.toFixed(2)})</span>
            )}
          </button>
          
          {aiCart.length > 0 && (
            <button
              onClick={onAddToMainCart}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Add to Cart
            </button>
          )}
        </div>
      </div>

      {/* AI Cart Dropdown */}
      {showAICart && aiCart.length > 0 && (
        <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">AI Cart ({aiCart.length} items)</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {aiCart.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">×{item.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">₵{(item.price * item.quantity).toFixed(2)}</span>
                  <button
                    onClick={() => onRemoveFromAICart(item.id)}
                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <span className="font-medium text-gray-900 dark:text-white">Total:</span>
            <span className="font-bold text-lg text-gray-900 dark:text-white">₵{totalAICartValue.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Final List Section */}
      {finalListProducts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Final Recommendation
          </h4>
          
          <div className="relative">
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 shadow-lg rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div 
              className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-8"
              style={{ scrollBehavior: 'smooth' }}
            >
              {finalListProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isInAICart={isInAICart(product.id)}
                  onAddToAICart={() => onAddToAICart(product)}
                  variant="final"
                />
              ))}
            </div>
            
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 shadow-lg rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Alternatives Section */}
      {alternativeProducts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            AI Also Considered (Alternatives)
          </h4>
          
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {alternativeProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isInAICart={isInAICart(product.id)}
                onAddToAICart={() => onAddToAICart(product)}
                variant="alternative"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Product Card Component
interface ProductCardProps {
  product: AIRecommendedProduct
  isInAICart: boolean
  onAddToAICart: () => void
  variant: 'final' | 'alternative'
}

function ProductCard({ product, isInAICart, onAddToAICart, variant }: ProductCardProps) {
  return (
    <div className={`flex-shrink-0 w-48 p-3 rounded-lg border-2 transition-all ${
      variant === 'final' 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    } ${isInAICart ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Product Image */}
      <div className="relative w-full h-24 mb-2 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <ShoppingCart className="h-8 w-8" />
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <h5 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
        {product.name}
      </h5>
      
      {product.category && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{product.category}</span>
      )}
      
      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="font-bold text-gray-900 dark:text-white">₵{product.price.toFixed(2)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">×{product.quantity}</span>
        </div>
      </div>
      
      {/* Deliberation Reason Tooltip */}
      {product.deliberationReason && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
          {product.deliberationReason}
        </p>
      )}
      
      {/* Add to AI Cart Button */}
      <button
        onClick={onAddToAICart}
        disabled={isInAICart}
        className={`w-full mt-2 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isInAICart
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-default'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isInAICart ? (
          <>
            <Check className="h-3 w-3" />
            Added
          </>
        ) : (
          <>
            <Plus className="h-3 w-3" />
            Add to AI Cart
          </>
        )}
      </button>
    </div>
  )
}
