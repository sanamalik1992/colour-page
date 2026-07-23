import { NextRequest, NextResponse } from 'next/server'

/**
 * Lightweight sink for client-side failures (upload/prep/select), so an error
 * that happens on someone else's phone is visible in the server logs instead of
 * vanishing into a blank screen. Intentionally minimal: log and return 204.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const stage = String(body?.stage || 'unknown').slice(0, 40)
    const message = String(body?.message || '').slice(0, 500)
    const detail = String(body?.detail || '').slice(0, 500)
    const ua = request.headers.get('user-agent')?.slice(0, 200) || ''
    console.error(`[client-error] stage=${stage} msg=${message} detail=${detail} ua=${ua}`)
  } catch {
    /* never throw from a logging endpoint */
  }
  return new NextResponse(null, { status: 204 })
}
