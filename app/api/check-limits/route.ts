import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const FREE_LIMIT = 3

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Count completed jobs for this session
  const { count, error } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['completed', 'processing', 'pending'])

  if (error) {
    console.error('Check limits error:', error)
    return NextResponse.json({ canCreate: true, remaining: FREE_LIMIT, used: 0 })
  }

  const used = count || 0
  const remaining = Math.max(0, FREE_LIMIT - used)
  const canCreate = remaining > 0

  return NextResponse.json({ 
    canCreate, 
    remaining, 
    used,
    limit: FREE_LIMIT
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    return NextResponse.json({ canCreate: true, remaining: FREE_LIMIT })
  }
}
