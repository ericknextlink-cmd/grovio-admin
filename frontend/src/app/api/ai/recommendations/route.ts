import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Recommendations Proxy Route
 * 
 * This route proxies AI recommendation requests to the backend server.
 * Benefits:
 * 1. Masks the backend URL from the client
 * 2. Handles authentication via user session
 * 3. Adds CORS and security headers
 * 4. Can be extended for rate limiting, caching, etc.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    // Get user session from request (you'll need to implement session validation)
    const authHeader = request.headers.get('authorization')
    const sessionToken = request.cookies.get('session')?.value
    
    // Parse request body
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Forward request to backend with authentication
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/ai/supplier-recommendations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
          ...(sessionToken && { 'X-Session-Token': sessionToken }),
        },
        body: JSON.stringify({ message }),
      }
    )

    // Get response from backend
    const data = await backendResponse.json()

    // Return response to client
    return NextResponse.json(data, {
      status: backendResponse.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error('AI Proxy Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process AI recommendation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
