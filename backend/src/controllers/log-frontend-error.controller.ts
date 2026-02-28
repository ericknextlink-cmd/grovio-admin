import { Request, Response } from 'express'

/**
 * Logs frontend errors to server logs so developers can see them on the deployed platform.
 * No auth required; payload is logged and discarded.
 */
export function logFrontendError(req: Request, res: Response): void {
  const body = req.body as {
    message?: string
    name?: string
    stack?: string
    componentStack?: string
    userAgent?: string
    url?: string
    timestamp?: string
  }

  const message = body?.message ?? 'Unknown'
  const name = body?.name ?? 'Error'
  const url = body?.url ?? ''
  const timestamp = body?.timestamp ?? new Date().toISOString()

  // Single line for log aggregation; full details for debugging
  console.error(
    `[FRONTEND_ERROR] ${timestamp} | ${name}: ${message} | url=${url}`
  )
  if (body?.stack) {
    console.error('[FRONTEND_ERROR] stack:', body.stack)
  }
  if (body?.componentStack) {
    console.error('[FRONTEND_ERROR] componentStack:', body.componentStack)
  }
  if (body?.userAgent) {
    console.error('[FRONTEND_ERROR] userAgent:', body.userAgent)
  }

  res.status(204).send()
}
