import { create } from 'zustand'
import { GroceryProduct, GroceryCategory, Order, Transaction, AdminState, AdminActions } from '@/types/grocery'
import { generateId, validateImageUrl } from '@/lib/utils'

// Sample data for demonstration
const sampleCategories: GroceryCategory[] = [
  { id: '1', name: 'Fruits & Vegetables', subcategories: ['Fresh Fruits', 'Fresh Vegetables', 'Organic', 'Frozen'] },
  { id: '2', name: 'Dairy & Eggs', subcategories: ['Milk', 'Cheese', 'Yogurt', 'Eggs', 'Butter'] },
  { id: '3', name: 'Meat & Seafood', subcategories: ['Beef', 'Pork', 'Chicken', 'Fish', 'Seafood'] },
  { id: '4', name: 'Pantry', subcategories: ['Grains', 'Pasta', 'Canned Goods', 'Condiments', 'Snacks'] },
  { id: '5', name: 'Beverages', subcategories: ['Water', 'Juice', 'Soda', 'Coffee', 'Tea'] },
]

const sampleProducts: GroceryProduct[] = [
  {
    id: '1',
    name: 'Organic Bananas',
    brand: 'Fresh Harvest',
    description: 'Sweet organic bananas, perfect for smoothies or snacking',
    category: 'Fruits & Vegetables',
    subcategory: 'Fresh Fruits',
    price: 15.99,
    currency: 'GH₵',
    quantity: 50,
    weight: 1.5,
    type: 'Organic',
    packaging: 'Bunch',
    inStock: true,
    rating: 4.5,
    reviews: 128,
    images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Whole Milk',
    brand: 'Dairy Fresh',
    description: 'Rich and creamy whole milk, perfect for coffee and cooking',
    category: 'Dairy & Eggs',
    subcategory: 'Milk',
    price: 18.49,
    currency: 'GH₵',
    quantity: 30,
    volume: 1,
    type: 'Regular',
    packaging: 'Gallon',
    inStock: true,
    rating: 4.2,
    reviews: 89,
    images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop'],
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: '3',
    name: 'Grass-Fed Beef',
    brand: 'Premium Meats',
    description: 'High-quality grass-fed beef, tender and flavorful',
    category: 'Meat & Seafood',
    subcategory: 'Beef',
    price: 89.99,
    currency: 'GH₵',
    quantity: 15,
    weight: 1,
    type: 'Grass-Fed',
    packaging: 'Vacuum Packed',
    inStock: false,
    rating: 4.8,
    reviews: 156,
    images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop'],
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13'),
  },
]

const sampleOrders: Order[] = [
  {
    id: '1',
    customerName: 'Kwame Asante',
    customerEmail: 'kwame@example.com',
    customerPhone: '+233 24 123 4567',
    items: [
      {
        productId: '1',
        productName: 'Organic Bananas',
        productImage: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
        quantity: 2,
        unitPrice: 15.99,
        totalPrice: 31.98,
      },
      {
        productId: '2',
        productName: 'Whole Milk',
        productImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
        quantity: 1,
        unitPrice: 18.49,
        totalPrice: 18.49,
      },
    ],
    totalAmount: 50.47,
    currency: 'GH₵',
    status: 'delivered',
    paymentMethod: 'mobile_money',
    deliveryAddress: '123 Accra Street, Accra, Ghana',
    notes: 'Please deliver in the morning',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    customerName: 'Ama Osei',
    customerEmail: 'ama@example.com',
    customerPhone: '+233 26 987 6543',
    items: [
      {
        productId: '3',
        productName: 'Grass-Fed Beef',
        productImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
        quantity: 1,
        unitPrice: 89.99,
        totalPrice: 89.99,
      },
    ],
    totalAmount: 89.99,
    currency: 'GH₵',
    status: 'processing',
    paymentMethod: 'card',
    deliveryAddress: '456 Kumasi Road, Kumasi, Ghana',
    createdAt: new Date('2024-01-21'),
    updatedAt: new Date('2024-01-21'),
  },
  {
    id: '3',
    customerName: 'Kofi Mensah',
    customerEmail: 'kofi@example.com',
    customerPhone: '+233 20 555 1234',
    items: [
      {
        productId: '1',
        productName: 'Organic Bananas',
        productImage: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
        quantity: 3,
        unitPrice: 15.99,
        totalPrice: 47.97,
      },
      {
        productId: '2',
        productName: 'Whole Milk',
        productImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
        quantity: 2,
        unitPrice: 18.49,
        totalPrice: 36.98,
      },
    ],
    totalAmount: 84.95,
    currency: 'GH₵',
    status: 'pending',
    paymentMethod: 'cash',
    deliveryAddress: '789 Cape Coast Drive, Cape Coast, Ghana',
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22'),
  },
]

const sampleTransactions: Transaction[] = [
  {
    id: '1',
    orderId: '1',
    customerName: 'Kwame Asante',
    customerEmail: 'kwame@example.com',
    amount: 50.47,
    currency: 'GH₵',
    paymentMethod: 'mobile_money',
    status: 'completed',
    transactionId: 'TXN001',
    paymentReference: 'MOB_001_20240120',
    notes: 'Payment successful via MTN Mobile Money',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    orderId: '2',
    customerName: 'Ama Osei',
    customerEmail: 'ama@example.com',
    amount: 89.99,
    currency: 'GH₵',
    paymentMethod: 'card',
    status: 'completed',
    transactionId: 'TXN002',
    paymentReference: 'CARD_002_20240121',
    notes: 'Visa card payment processed',
    createdAt: new Date('2024-01-21'),
    updatedAt: new Date('2024-01-21'),
  },
  {
    id: '3',
    orderId: '3',
    customerName: 'Kofi Mensah',
    customerEmail: 'kofi@example.com',
    amount: 84.95,
    currency: 'GH₵',
    paymentMethod: 'cash',
    status: 'pending',
    notes: 'Cash on delivery - payment pending',
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22'),
  },
]

const initialState: AdminState = {
  products: sampleProducts,
  categories: sampleCategories,
  orders: sampleOrders,
  transactions: sampleTransactions,
  stats: {
    totalProducts: sampleProducts.length,
    inStock: sampleProducts.filter(p => p.inStock).length,
    outOfStock: sampleProducts.filter(p => !p.inStock).length,
    categories: sampleCategories.length,
    totalOrders: sampleOrders.length,
    pendingOrders: sampleOrders.filter(o => o.status === 'pending').length,
    totalRevenue: sampleOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    totalTransactions: sampleTransactions.length,
    pendingTransactions: sampleTransactions.filter(t => t.status === 'pending').length,
    completedTransactions: sampleTransactions.filter(t => t.status === 'completed').length,
  },
  searchQuery: '',
  selectedCategory: '',
  isLoading: false,
  error: null,
}

export const useAdminStore = create<AdminState & AdminActions>((set, get) => ({
  ...initialState,

  // Product CRUD Operations
  addProduct: (productData) => {
    const newProduct: GroceryProduct = {
      ...productData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      images: productData.images.map(img => validateImageUrl(img)),
    }
    
    set((state) => ({
      products: [...state.products, newProduct],
    }))
    
    get().updateStats()
  },

  updateProduct: (id, updates) => {
    set((state) => ({
      products: state.products.map(product =>
        product.id === id
          ? {
              ...product,
              ...updates,
              updatedAt: new Date(),
              images: updates.images ? updates.images.map(img => validateImageUrl(img)) : product.images,
            }
          : product
      ),
    }))
    
    get().updateStats()
  },

  deleteProduct: (id) => {
    set((state) => ({
      products: state.products.filter(product => product.id !== id),
    }))
    
    get().updateStats()
  },

  getProduct: (id) => {
    return get().products.find(product => product.id === id)
  },

  // Category CRUD Operations
  addCategory: (categoryData) => {
    const newCategory: GroceryCategory = {
      ...categoryData,
      id: generateId(),
    }
    
    set((state) => ({
      categories: [...state.categories, newCategory],
    }))
    
    get().updateStats()
  },

  updateCategory: (id, updates) => {
    set((state) => ({
      categories: state.categories.map(category =>
        category.id === id ? { ...category, ...updates } : category
      ),
    }))
    
    get().updateStats()
  },

  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter(category => category.id !== id),
    }))
    
    get().updateStats()
  },

  getCategory: (id) => {
    return get().categories.find(category => category.id === id)
  },

  // Order CRUD Operations
  addOrder: (orderData) => {
    const newOrder: Order = {
      ...orderData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    set((state) => ({
      orders: [...state.orders, newOrder],
    }))
    
    get().updateStats()
  },

  updateOrder: (id, updates) => {
    set((state) => ({
      orders: state.orders.map(order =>
        order.id === id
          ? {
              ...order,
              ...updates,
              updatedAt: new Date(),
            }
          : order
      ),
    }))
    
    get().updateStats()
  },

  deleteOrder: (id) => {
    set((state) => ({
      orders: state.orders.filter(order => order.id !== id),
    }))
    
    get().updateStats()
  },

  getOrder: (id) => {
    return get().orders.find(order => order.id === id)
  },

  updateOrderStatus: (id, status) => {
    get().updateOrder(id, { status })
  },

  // Transaction CRUD Operations
  addTransaction: (transactionData) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    set((state) => ({
      transactions: [...state.transactions, newTransaction],
    }))
    
    get().updateStats()
  },

  updateTransaction: (id, updates) => {
    set((state) => ({
      transactions: state.transactions.map(transaction =>
        transaction.id === id ? { ...transaction, ...updates, updatedAt: new Date() } : transaction
      ),
    }))
    
    get().updateStats()
  },

  deleteTransaction: (id) => {
    set((state) => ({
      transactions: state.transactions.filter(transaction => transaction.id !== id),
    }))
    
    get().updateStats()
  },

  getTransaction: (id) => {
    return get().transactions.find(transaction => transaction.id === id)
  },

  // Search and Filter
  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  setSelectedCategory: (category) => {
    set({ selectedCategory: category })
  },

  getFilteredProducts: () => {
    const { products, searchQuery, selectedCategory } = get()
    
    return products.filter(product => {
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === '' || product.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  },

  getFilteredOrders: () => {
    const { orders, searchQuery } = get()
    
    return orders.filter(order => {
      const matchesSearch = searchQuery === '' || 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.status.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSearch
    })
  },

  // Stats
  updateStats: () => {
    const { products, categories, orders, transactions } = get()
    set({
      stats: {
        totalProducts: products.length,
        inStock: products.filter(p => p.inStock).length,
        outOfStock: products.filter(p => !p.inStock).length,
        categories: categories.length,
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
        totalTransactions: transactions.length,
        pendingTransactions: transactions.filter(t => t.status === 'pending').length,
        completedTransactions: transactions.filter(t => t.status === 'completed').length,
      }
    })
  },

  // Transaction Status Update
  updateTransactionStatus: (id, status) => {
    get().updateTransaction(id, { status })
  },

  // Get Filtered Transactions
  getFilteredTransactions: () => {
    const { transactions, searchQuery } = get()
    
    return transactions.filter(transaction => {
      const matchesSearch = searchQuery === '' || 
        transaction.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (transaction.transactionId && transaction.transactionId.toLowerCase().includes(searchQuery.toLowerCase()))
      
      return matchesSearch
    })
  },

  // Utility
  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  setError: (error) => {
    set({ error })
  },
}))
