import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FREE_LIMIT = 3

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  const email = request.nextUrl.searchParams.get('email')?.toLowerCase()
  
  // Check if Pro user by email
  if (email) {
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('is_pro')
      .eq('email', email)
      .maybeSingle()

    if (customer?.is_pro) {
      return NextResponse.json({ 
        canCreate: true, 
        isPro: true, 
        remaining: 999,
        used: 0,
        limit: 999
      })
    }
  }

  if (!sessionId) {
    return NextResponse.json({ 
      canCreate: true, 
      remaining: FREE_LIMIT, 
      used: 0,
      limit: FREE_LIMIT,
      isPro: false
    })
  }

  // Count completed jobs for this session
  const { count, error } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['completed', 'processing', 'pending'])

  if (error) {
    console.error('Check limits error:', error)
    return NextResponse.json({ canCreate: true, remaining: FREE_LIMIT, used: 0, limit: FREE_LIMIT, isPro: false })
  }

  const used = count || 0
  const remaining = Math.max(0, FREE_LIMIT - used)
  const canCreate = remaining > 0

  return NextResponse.json({ 
    canCreate, 
    remaining, 
    used,
    limit: FREE_LIMIT,
    isPro: false
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ canCreate: true, isPro: false, remaining: FREE_LIMIT })
    }

    // Check if user is Pro
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('is_pro')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (customer?.is_pro) {
      return NextResponse.json({ canCreate: true, isPro: true, remaining: 999 })
    }

    return NextResponse.json({ canCreate: true, isPro: false, remaining: FREE_LIMIT })
  } catch {
    return NextResponse.json({ canCreate: true, isPro: false, remaining: FREE_LIMIT })
  }
}
