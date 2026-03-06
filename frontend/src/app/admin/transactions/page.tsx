'use client'

import React, { useState, useEffect } from 'react'
import TransactionsTable from '@/components/TransactionsTable'
import AdminSidebar from '@/components/AdminSidebar'
import { Transaction, TransactionStatus } from '@/types/grocery'
import { X } from 'lucide-react'
import { ordersApi } from '@/lib/api'
import { toast } from 'sonner'

function mapRowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: (row.id as string) || '',
    orderId: String(row.orderId ?? row.order_id ?? ''),
    customerName: (row.customerName as string) || '—',
    customerEmail: (row.customerEmail as string) || '—',
    amount: Number(row.amount ?? 0),
    currency: (row.currency as string) || 'GHS',
    paymentMethod: ((row.paymentMethod as string) ?? (row.payment_method as string) ?? 'paystack').replace(/-/g, '_') as Transaction['paymentMethod'],
    status: (row.status as TransactionStatus) || 'pending',
    transactionId: row.transactionId as string | undefined,
    paymentReference: row.paymentReference as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.createdAt ? new Date(row.createdAt as string) : new Date(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt as string) : new Date(),
  }
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchTransactions = async () => {
      setLoading(true)
      try {
        const res = await ordersApi.getAdminTransactions({ limit: 200 })
        if (cancelled) return
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : []
          setTransactions(list.map((row: Record<string, unknown>) => mapRowToTransaction(row)))
        } else {
          setTransactions([])
        }
      } catch {
        if (!cancelled) setTransactions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchTransactions()
    return () => { cancelled = true }
  }, [])

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsEditModalOpen(true)
  }

  const handleDeleteTransaction = (_transaction: Transaction) => {
    toast.info('Transaction deletion is not available.')
  }

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsViewModalOpen(true)
  }

  const handleUpdateTransactionStatus = (_transactionId: string, _status: TransactionStatus) => {
    toast.info('Transaction status updates are not available via API.')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        currentPage="transactions"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="lg:ml-64">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions Management</h1>
              <p className="text-gray-600 dark:text-gray-400">View and manage payment transactions</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
            </div>
          ) : (
            <TransactionsTable
              transactions={transactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onView={handleViewTransaction}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
        </div>
      </div>

      {isViewModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Transaction Details {selectedTransaction.transactionId || `TXN-${selectedTransaction.id.slice(-6)}`}
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Transaction ID:</span> {selectedTransaction.transactionId || 'N/A'}</p>
                    <p><span className="font-medium">Order ID:</span> {selectedTransaction.orderId}</p>
                    <p><span className="font-medium">Amount:</span> {selectedTransaction.amount} {selectedTransaction.currency}</p>
                    <p><span className="font-medium">Payment Method:</span> {selectedTransaction.paymentMethod.replace('_', ' ')}</p>
                    <p><span className="font-medium">Status:</span> {selectedTransaction.status}</p>
                    <p><span className="font-medium">Date:</span> {selectedTransaction.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedTransaction.customerName}</p>
                    <p><span className="font-medium">Email:</span> {selectedTransaction.customerEmail}</p>
                  </div>
                </div>
              </div>

              {selectedTransaction.paymentReference && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Reference</h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedTransaction.paymentReference}</p>
                </div>
              )}

              {selectedTransaction.notes && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notes</h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedTransaction.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Transaction {selectedTransaction.transactionId || `TXN-${selectedTransaction.id.slice(-6)}`}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Transaction Status
                </label>
                <select
                  value={selectedTransaction.status}
                  onChange={(e) => handleUpdateTransactionStatus(selectedTransaction.id, e.target.value as TransactionStatus)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status updates are view-only; changes are not persisted.</p>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
