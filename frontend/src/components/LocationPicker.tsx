'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Search, X } from 'lucide-react'

export interface LocationCoords {
  lat: number
  lng: number
}

interface LocationPickerProps {
  selectedLocation: string
  onLocationSelect: (addressText: string, coords?: LocationCoords) => void
  placeholder?: string
  /** Label for the modal (e.g. "Warehouse location") */
  modalTitle?: string
}

interface AutocompletePrediction {
  place_id: string
  description: string
}

type ListItem = { place_id: string; description: string; isDefault?: boolean }

const DEFAULT_ACCRA = [
  'Accra Central, Accra, Ghana',
  'East Legon, Accra, Ghana',
  'Osu, Accra, Ghana',
  'Labone, Accra, Ghana',
  'Cantonments, Accra, Ghana',
  'Airport Residential, Accra, Ghana',
  'Tema, Greater Accra, Ghana',
]

export default function LocationPicker({
  selectedLocation,
  onLocationSelect,
  placeholder = 'Select warehouse location',
  modalTitle = 'Select Location',
}: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const defaultResults: ListItem[] = useMemo(
    () =>
      DEFAULT_ACCRA.map((location, index) => ({
        place_id: `default_${index}`,
        description: location,
        isDefault: true,
      })),
    []
  )

  useEffect(() => {
    if (isOpen && !searchQuery.trim() && searchResults.length === 0) {
      setSearchResults(defaultResults)
    }
  }, [isOpen, searchQuery, searchResults.length, defaultResults])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setError('')
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!query.trim()) {
      setSearchResults(defaultResults)
      return
    }
    searchTimeoutRef.current = setTimeout(() => performSearch(query), 300)
  }

  const performSearch = async (query: string) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(query)}`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Search failed')
        setSearchResults([])
        return
      }
      const predictions: AutocompletePrediction[] = data.predictions || []
      setSearchResults(
        predictions.map((p) => ({
          place_id: p.place_id,
          description: p.description,
        }))
      )
    } catch {
      setError('Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationSelect = async (item: ListItem) => {
    if (item.isDefault || item.place_id.startsWith('default_')) {
      onLocationSelect(item.description)
      setIsOpen(false)
      setSearchQuery('')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/places/details?place_id=${encodeURIComponent(item.place_id)}`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not get address')
        return
      }
      const lat = data.geometry?.location?.lat
      const lng = data.geometry?.location?.lng
      const coords =
        typeof lat === 'number' && typeof lng === 'number'
          ? { lat, lng }
          : undefined
      onLocationSelect(item.description, coords)
      setIsOpen(false)
      setSearchQuery('')
    } catch {
      setError('Could not load address')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSearchQuery('')
    setError('')
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full justify-between text-left font-normal"
      >
        <span className="truncate">
          {selectedLocation || placeholder}
        </span>
        <MapPin className="h-4 w-4 text-[#D35F0E] shrink-0" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {modalTitle}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search for locations in Accra, Ghana..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    {error}
                  </p>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D35F0E] mx-auto mb-2" />
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((item) => (
                      <button
                        key={item.place_id}
                        type="button"
                        onClick={() => handleLocationSelect(item)}
                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-[#D35F0E] mt-0.5 shrink-0" />
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No locations found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
