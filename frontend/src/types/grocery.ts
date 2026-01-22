export interface GroceryProduct {
  id: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  quantity: number;
  weight?: number;
  volume?: number;
  type: string;
  packaging: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroceryCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  images: string[];
  subcategories: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryAddress: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'bank_transfer';

export interface Transaction {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  transactionId?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface AdminStats {
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  categories: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
}

export interface ImageUploadMethod {
  type: 'drag-drop' | 'file-select' | 'url-input';
  data: File[] | string;
}

export interface AdminState {
  products: GroceryProduct[];
  categories: GroceryCategory[];
  orders: Order[];
  transactions: Transaction[];
  stats: AdminStats;
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;
}

export interface AdminActions {
  // Product CRUD
  addProduct: (product: Omit<GroceryProduct, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<GroceryProduct>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => GroceryProduct | undefined;
  
  // Category CRUD
  addCategory: (category: Omit<GroceryCategory, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<GroceryCategory>) => void;
  deleteCategory: (id: string) => void;
  getCategory: (id: string) => GroceryCategory | undefined;
  
  // Order CRUD
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  getOrder: (id: string) => Order | undefined;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  
  // Transaction CRUD
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getTransaction: (id: string) => Transaction | undefined;
  updateTransactionStatus: (id: string, status: TransactionStatus) => void;
  
  // Search and Filter
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  getFilteredProducts: () => GroceryProduct[];
  getFilteredOrders: () => Order[];
  getFilteredTransactions: () => Transaction[];
  
  // Stats
  updateStats: () => void;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
