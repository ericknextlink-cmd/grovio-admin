type JsonRecord = Record<string, unknown>

async function requestJson(
  url: string,
  init?: RequestInit
): Promise<{ status: number; json: JsonRecord | null }> {
  const response = await fetch(url, init)
  let json: JsonRecord | null = null
  try {
    json = (await response.json()) as JsonRecord
  } catch {
    json = null
  }
  return { status: response.status, json }
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

async function run(): Promise<void> {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000'
  const root = baseUrl.replace(/\/$/, '')

  console.log(`Running auth smoke tests against: ${root}`)

  // 1) Health endpoint should be available.
  const health = await requestJson(`${root}/api/health`)
  assertCondition(health.status >= 200 && health.status < 300, 'Health endpoint failed')

  // 2) Protected onboarding status must reject guest users.
  const onboardingGuest = await requestJson(`${root}/api/users/onboarding-status`)
  assertCondition(
    onboardingGuest.status === 401,
    `Expected 401 for guest onboarding status, got ${onboardingGuest.status}`
  )

  // 3) Optional-auth AI endpoint should not reject guest by auth middleware.
  const aiGuest = await requestJson(`${root}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'hello' }),
  })
  assertCondition(
    aiGuest.status !== 401,
    `Expected non-401 for guest AI chat optional-auth route, got ${aiGuest.status}`
  )

  // 4) Auth-required AI thread endpoint should reject guest users.
  const aiThreadGuest = await requestJson(`${root}/api/ai/threads`)
  assertCondition(
    aiThreadGuest.status === 401,
    `Expected 401 for guest AI threads route, got ${aiThreadGuest.status}`
  )

  // 5) Delivery verification route should be public (auth-wise).
  const deliveryVerify = await requestJson(`${root}/api/orders/delivery/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: '0000' }),
  })
  assertCondition(
    deliveryVerify.status !== 401,
    `Expected non-401 for delivery verify public route, got ${deliveryVerify.status}`
  )

  console.log('Auth smoke tests passed')
}

run().catch((error) => {
  console.error('Auth smoke tests failed:', error)
  process.exit(1)
})

