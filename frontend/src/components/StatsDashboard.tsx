/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React from 'react'
import { Package, CheckCircle, XCircle, Tag, TrendingUp, ShoppingCart, DollarSign, CreditCard, Clock } from 'lucide-react'
import { AdminStats } from '@/types/grocery'
import { cn, formatPrice } from '@/lib/utils'

interface StatsDashboardProps {
  stats: AdminStats
  className?: string
}

const statCards = [
  {
    key: 'totalProducts',
    label: 'Total Products',
    icon: Package,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    key: 'inStock',
    label: 'In Stock',
    icon: CheckCircle,
    color: 'bg-green-500',
    textColor: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
  {
    key: 'outOfStock',
    label: 'Out of Stock',
    icon: XCircle,
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
  },
  {
    key: 'categories',
    label: 'Categories',
    icon: Tag,
    color: 'bg-purple-500',
    textColor: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  {
    key: 'totalOrders',
    label: 'Total Orders',
    icon: ShoppingCart,
    color: 'bg-indigo-500',
    textColor: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
  },
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    icon: DollarSign,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    key: 'totalTransactions',
    label: 'Transactions',
    icon: CreditCard,
    color: 'bg-amber-500',
    textColor: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    key: 'pendingTransactions',
    label: 'Pending Payments',
    icon: Clock,
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
  },
]

export default function StatsDashboard({ stats, className }: StatsDashboardProps) {
  const getStatValue = (key: string) => {
    return stats[key as keyof AdminStats] || 0
  }

  const getStockPercentage = () => {
    if (stats.totalProducts === 0) return 0
    return Math.round((stats.inStock / stats.totalProducts) * 100)
  }

  const formatStatValue = (key: string, value: any) => {
    if (key === 'totalRevenue') {
      return formatPrice(value, 'GH₵')
    }
    return value.toLocaleString()
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Store Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Key metrics and performance indicators
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <TrendingUp className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          const value = getStatValue(card.key)
          
          return (
            <div
              key={card.key}
              className={cn(
                "p-6 rounded-xl border border-gray-200 dark:border-gray-700",
                card.bgColor
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatStatValue(card.key, value)}
                  </p>
                </div>
                <div className={cn("p-3 rounded-lg", card.color)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Status Chart */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Stock Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">In Stock</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.inStock} ({getStockPercentage()}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getStockPercentage()}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.outOfStock} ({stats.totalProducts > 0 ? Math.round((stats.outOfStock / stats.totalProducts) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Orders & Revenue */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Orders & Revenue
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Orders</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.totalOrders}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</span>
              <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                {stats.pendingOrders}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {formatPrice(stats.totalRevenue, 'GH₵')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Order Value</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.totalOrders > 0 ? formatPrice(stats.totalRevenue / stats.totalOrders, 'GH₵') : formatPrice(0, 'GH₵')}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Transactions
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.totalTransactions}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</span>
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                {stats.pendingTransactions}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed Payments</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {stats.completedTransactions}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.totalTransactions > 0 ? Math.round((stats.completedTransactions / stats.totalTransactions) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
