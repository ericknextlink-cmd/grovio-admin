/**
 * Server-side Place Autocomplete for admin (e.g. Delivery Settings warehouse picker).
 * Uses Google Places API; key must be set in admin env (GOOGLE_MAPS_API_KEY).
 */
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY ?? ''

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('input')?.trim()
  if (!input || input.length < 2) {
    return NextResponse.json(
      { predictions: [], error: 'Input too short' },
      { status: 400 }
    )
  }

  if (!GOOGLE_MAPS_KEY) {
    return NextResponse.json(
      { predictions: [], error: 'Google Maps API key not configured' },
      { status: 503 }
    )
  }

  const params = new URLSearchParams({
    input,
    key: GOOGLE_MAPS_KEY,
    components: 'country:gh',
    types: 'establishment|geocode',
  })

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
      { next: { revalidate: 0 } }
    )
    const data = await res.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json(
        { predictions: [], error: data.error_message || data.status },
        { status: 502 }
      )
    }

    const predictions = (data.predictions || []).slice(0, 7).map((p: { place_id?: string; description?: string }) => ({
      place_id: p.place_id || '',
      description: p.description || '',
    }))

    return NextResponse.json({ predictions })
  } catch (err) {
    console.error('Places autocomplete error:', err)
    return NextResponse.json(
      { predictions: [], error: 'Autocomplete failed' },
      { status: 502 }
    )
  }
}
