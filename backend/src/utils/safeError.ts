/**
 * Use when returning error messages in API responses.
 * In production, returns a generic message to avoid leaking internal details.
 */
export function safeErrorMessage(detail: string, generic = 'An error occurred'): string {
  return process.env.NODE_ENV === 'development' ? detail : generic
}
