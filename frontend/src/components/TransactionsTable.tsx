'use client'

import React, { useState } from 'react'
import { Search, Edit, Trash2, Eye, CreditCard, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Transaction, TransactionStatus } from '@/types/grocery'
import { formatPrice, formatDate, getPaymentMethodIcon } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TransactionsTableProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onView: (transaction: Transaction) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const statusIcons = {
  pending: Clock,
  completed: CheckCircle,
  failed: XCircle,
  refunded: RefreshCw,
  cancelled: XCircle,
}

export default function TransactionsTable({
  transactions,
  onEdit,
  onDelete,
  onView,
  searchQuery,
  onSearchChange,
}: TransactionsTableProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | ''>('')

  const filteredTransactions = (transactions ?? []).filter(transaction => {
    const matchesSearch = searchQuery === '' || 
      transaction.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (transaction.transactionId && transaction.transactionId.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = selectedStatus === '' || transaction.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const handleDelete = (transaction: Transaction) => {
    setShowDeleteConfirm(transaction.id)
  }

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      const transaction = transactions.find(t => t.id === showDeleteConfirm)
      if (transaction) {
        onDelete(transaction)
      }
      setShowDeleteConfirm(null)
    }
  }

  const getStatusIcon = (status: TransactionStatus) => {
    const Icon = statusIcons[status]
    return Icon ? <Icon className="h-4 w-4" /> : null
  }

  const getStatusColor = (status: TransactionStatus) => {
    const statusColors: Record<TransactionStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Transactions Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage payment transactions
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions by customer, status, or transaction ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          />
        </div>
        
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as TransactionStatus | '')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Transactions Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
        {selectedStatus && ` with status "${selectedStatus}"`}
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Transaction Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.transactionId || `TXN-${transaction.id.slice(-6)}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Order #{transaction.orderId.slice(-6)}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.customerName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.customerEmail}
                      </p>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(transaction.status)}
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        getStatusColor(transaction.status)
                      )}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getPaymentMethodIcon(transaction.paymentMethod)}</span>
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {transaction.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatPrice(transaction.amount, transaction.currency)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(transaction.createdAt)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onView(transaction)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(transaction)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(transaction)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <CreditCard className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No transactions found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || selectedStatus
                ? 'Try adjusting your search or filter criteria'
                : 'No transactions have been recorded yet'
              }
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
