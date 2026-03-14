/**
 * Server-side Place Details for admin (e.g. Delivery Settings warehouse picker).
 * Returns geometry (lat/lng) for the selected place.
 */
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY ?? ''

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('place_id')?.trim()
  if (!placeId) {
    return NextResponse.json(
      { error: 'place_id required' },
      { status: 400 }
    )
  }

  if (!GOOGLE_MAPS_KEY) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 503 }
    )
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_MAPS_KEY,
    fields: 'formatted_address,name,geometry',
  })

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
      { next: { revalidate: 0 } }
    )
    const data = await res.json()

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: data.error_message || data.status },
        { status: 502 }
      )
    }

    const result = data.result || {}
    const loc = result.geometry?.location || {}
    const place = {
      place_id: placeId,
      formatted_address: result.formatted_address || '',
      name: result.name || result.formatted_address || '',
      geometry: {
        location: {
          lat: typeof loc.lat === 'number' ? loc.lat : 0,
          lng: typeof loc.lng === 'number' ? loc.lng : 0,
        },
      },
    }

    return NextResponse.json(place)
  } catch (err) {
    console.error('Places details error:', err)
    return NextResponse.json(
      { error: 'Place details failed' },
      { status: 502 }
    )
  }
}
