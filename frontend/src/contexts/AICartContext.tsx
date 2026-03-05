'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

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

interface AICartContextType {
  aiCart: AIRecommendedProduct[]
  addToAICart: (product: AIRecommendedProduct) => void
  removeFromAICart: (productId: string) => void
  clearAICart: () => void
  getAICartTotal: () => number
  getAICartCount: () => number
  isInAICart: (productId: string) => boolean
  updateQuantity: (productId: string, quantity: number) => void
}

const AICartContext = createContext<AICartContextType | undefined>(undefined)

export function AICartProvider({ children }: { children: ReactNode }) {
  const [aiCart, setAICart] = useState<AIRecommendedProduct[]>([])

  const addToAICart = (product: AIRecommendedProduct) => {
    setAICart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        )
      }
      return [...prev, product]
    })
  }

  const removeFromAICart = (productId: string) => {
    setAICart(prev => prev.filter(item => item.id !== productId))
  }

  const clearAICart = () => {
    setAICart([])
  }

  const getAICartTotal = () => {
    return aiCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const getAICartCount = () => {
    return aiCart.reduce((count, item) => count + item.quantity, 0)
  }

  const isInAICart = (productId: string) => {
    return aiCart.some(item => item.id === productId)
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromAICart(productId)
      return
    }
    setAICart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    )
  }

  return (
    <AICartContext.Provider
      value={{
        aiCart,
        addToAICart,
        removeFromAICart,
        clearAICart,
        getAICartTotal,
        getAICartCount,
        isInAICart,
        updateQuantity
      }}
    >
      {children}
    </AICartContext.Provider>
  )
}

export function useAICart() {
  const context = useContext(AICartContext)
  if (context === undefined) {
    throw new Error('useAICart must be used within an AICartProvider')
  }
  return context
}
