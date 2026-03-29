'use client'

import React, { useState, useRef } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { ordersApi } from '@/lib/api'
import { toast } from 'sonner'
import { QrCode, Hash } from 'lucide-react'

/** Extract delivery verification token from QR content (URL or raw token) */
function extractTokenFromQrContent(content: string): string {
  const s = content.trim()
  // URL like https://.../delivery/verify/TOKEN or ...?token=TOKEN
  const verifyMatch = s.match(/\/delivery\/verify[-/]?([a-f0-9-]+)/i)
  if (verifyMatch) return verifyMatch[1]
  const paramMatch = s.match(/[?&]token=([^&]+)/i)
  if (paramMatch) return decodeURIComponent(paramMatch[1])
  // Raw UUID or token
  if (/^[a-f0-9-]{36}$/i.test(s)) return s
  return s
}

export default function ConfirmDeliveryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [code, setCode] = useState('')
  const [token, setToken] = useState('')
  const [loadingCode, setLoadingCode] = useState(false)
  const [loadingToken, setLoadingToken] = useState(false)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleVerifyByCode = async () => {
    const trimmed = code.replace(/\D/g, '').slice(0, 4)
    if (trimmed.length < 4) {
      toast.error('Please enter a 4-digit delivery code')
      return
    }
    setLoadingCode(true)
    try {
      const res = await ordersApi.verifyDeliveryByCode(trimmed)
      if (res.success) {
        toast.success(`Delivery confirmed. Order: ${(res.data as { orderNumber?: string })?.orderNumber ?? '—'}`)
        setCode('')
      } else {
        toast.error(res.message || 'Invalid code or order already delivered')
      }
    } catch {
      toast.error('Failed to verify delivery')
    } finally {
      setLoadingCode(false)
    }
  }

  const handleVerifyByToken = async () => {
    const t = token.trim()
    if (!t) {
      toast.error('Please enter or paste the verification token')
      return
    }
    const parsed = extractTokenFromQrContent(t)
    setLoadingToken(true)
    try {
      const res = await ordersApi.verifyDeliveryByToken(parsed)
      if (res.success) {
        toast.success(`Delivery confirmed. Order: ${(res.data as { orderNumber?: string })?.orderNumber ?? '—'}`)
        setToken('')
      } else {
        toast.error(res.message || 'Invalid token or order already delivered')
      }
    } catch {
      toast.error('Failed to verify delivery')
    } finally {
      setLoadingToken(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = async () => {
        try {
          const barcodeDetector = typeof (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !== 'undefined'
            ? new (window as unknown as { BarcodeDetector: new () => { detect: (img: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector()
            : null
          if (barcodeDetector) {
            const results = await barcodeDetector.detect(img)
            const value = results?.[0]?.rawValue
            if (value) {
              setToken(extractTokenFromQrContent(value))
              toast.success('QR code scanned. Click Verify by QR to confirm.')
            } else {
              toast.error('No QR code found in image')
            }
          } else {
            toast.info('QR scan from image is not supported in this browser. Paste the token manually.')
          }
        } finally {
          URL.revokeObjectURL(url)
          setScanning(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        setScanning(false)
        toast.error('Could not load image')
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      img.src = url
    } catch {
      setScanning(false)
      toast.error('Failed to read QR code')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        currentPage="confirm-delivery"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="lg:ml-64">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm Delivery</h1>
        </div>

        <div className="p-6 max-w-2xl space-y-8">
          {/* Verify by code */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verify by 4-digit code</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ask the customer for their delivery code and enter it below.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="e.g. 1234"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleVerifyByCode}
                disabled={loadingCode || code.replace(/\D/g, '').length < 4}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none font-medium"
              >
                {loadingCode ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </section>

          {/* Verify by QR / token */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verify by QR code</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scan the customer&apos;s QR with your phone and paste the token below, or upload an image of the QR.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Paste verification token (e.g. from scanned QR)"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  onClick={handleVerifyByToken}
                  disabled={loadingToken || !token.trim()}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none font-medium"
                >
                  {loadingToken ? 'Verifying…' : 'Verify by QR'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={scanning}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
                >
                  {scanning ? 'Scanning…' : 'Upload QR image'}
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Chrome/Edge: upload image to decode QR. Other browsers: paste token manually.
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
