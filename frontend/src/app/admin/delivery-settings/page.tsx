'use client'

import { useState, useEffect } from 'react'
import { Truck, MapPin, Save, Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/AdminSidebar'
import LocationPicker from '@/components/LocationPicker'
import { deliveryApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminDeliverySettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [warehouseLat, setWarehouseLat] = useState<string>('')
  const [warehouseLng, setWarehouseLng] = useState<string>('')
  const [warehouseAddress, setWarehouseAddress] = useState<string>('')
  const [pricePerKm, setPricePerKm] = useState<string>('')
  const [pricePerMeter, setPricePerMeter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    deliveryApi
      .getSettings()
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data
          setWarehouseLat(d.warehouseLat != null ? String(d.warehouseLat) : '')
          setWarehouseLng(d.warehouseLng != null ? String(d.warehouseLng) : '')
          setWarehouseAddress(d.warehouseAddress ?? '')
          setPricePerKm(d.pricePerKm != null ? String(d.pricePerKm) : '')
          setPricePerMeter(d.pricePerMeter != null ? String(d.pricePerMeter) : '')
        }
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load settings' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const lat = warehouseLat.trim() ? parseFloat(warehouseLat) : null
    const lng = warehouseLng.trim() ? parseFloat(warehouseLng) : null
    const km = pricePerKm.trim() !== '' ? parseFloat(pricePerKm) : 0
    const meter = pricePerMeter.trim() !== '' ? parseFloat(pricePerMeter) : null

    if (Number.isNaN(km) || km < 0) {
      setMessage({ type: 'error', text: 'Price per km must be a non-negative number' })
      return
    }
    if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      setMessage({ type: 'error', text: 'Warehouse latitude must be between -90 and 90' })
      return
    }
    if (lng != null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      setMessage({ type: 'error', text: 'Warehouse longitude must be between -180 and 180' })
      return
    }

    setSaving(true)
    setMessage(null)
    deliveryApi
      .updateSettings({
        warehouseLat: lat ?? undefined,
        warehouseLng: lng ?? undefined,
        warehouseAddress: warehouseAddress.trim() || undefined,
        pricePerKm: km,
        pricePerMeter: meter ?? undefined,
      })
      .then((res) => {
        if (res.success) {
          setMessage({ type: 'success', text: 'Delivery settings saved. Checkout delivery fee will use this warehouse and rate.' })
        } else {
          setMessage({ type: 'error', text: res.message ?? 'Save failed' })
        }
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to save settings' }))
      .finally(() => setSaving(false))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar currentPage="delivery-settings" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <div className="lg:ml-64 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#D35F0E]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar currentPage="delivery-settings" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="lg:ml-64 container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-8 w-8 text-[#D35F0E]" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Delivery Settings</h1>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Warehouse / platform location
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pick the warehouse address. Distance from this point to the customer delivery address is used to compute the delivery fee. Search and select a location (Ghana); coordinates are saved automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Warehouse address</Label>
            <LocationPicker
              selectedLocation={warehouseAddress}
              onLocationSelect={(addressText, coords) => {
                setWarehouseAddress(addressText)
                if (coords) {
                  setWarehouseLat(String(coords.lat))
                  setWarehouseLng(String(coords.lng))
                } else {
                  setWarehouseLat('')
                  setWarehouseLng('')
                }
              }}
              placeholder="Select warehouse location"
              modalTitle="Warehouse location"
            />
          </div>
          {(warehouseLat || warehouseLng) && (
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Coordinates (saved with address): Lat {warehouseLat || '—'}, Lng {warehouseLng || '—'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery rate</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fee = distance (km) × price per km. Optionally set price per meter for finer control.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price_per_km">Price per km (GHS) *</Label>
              <Input
                id="price_per_km"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 2.50"
                value={pricePerKm}
                onChange={(e) => setPricePerKm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="price_per_meter">Price per meter (GHS, optional)</Label>
              <Input
                id="price_per_meter"
                type="number"
                min="0"
                step="0.0001"
                placeholder="e.g. 0.0025"
                value={pricePerMeter}
                onChange={(e) => setPricePerMeter(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-[#D35F0E] hover:bg-[#D35F0E]/90">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save settings
            </>
          )}
        </Button>
      </div>
      </div>
    </div>
  )
}
