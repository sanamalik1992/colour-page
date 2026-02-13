/**
 * Server-side Pro gating and usage enforcement.
 *
 * All Pro checks and usage limits are enforced server-side.
 * Client UI should reflect these but never be the source of truth.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface UserPlan {
  isPro: boolean
  email: string | null
  stripeCustomerId: string | null
}

/**
 * Check whether a user (by email) is on the Pro plan.
 */
export async function getUserPlan(email?: string | null): Promise<UserPlan> {
  if (!email) {
    return { isPro: false, email: null, stripeCustomerId: null }
  }

  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('is_pro, stripe_customer_id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  return {
    isPro: customer?.is_pro === true,
    email: email.toLowerCase(),
    stripeCustomerId: customer?.stripe_customer_id || null,
  }
}

/**
 * Throw if the user is not Pro. Use in API routes that require Pro.
 */
export async function requirePro(email?: string | null): Promise<UserPlan> {
  const plan = await getUserPlan(email)
  if (!plan.isPro) {
    throw new ProRequiredError()
  }
  return plan
}

export class ProRequiredError extends Error {
  constructor() {
    super('Pro subscription required')
    this.name = 'ProRequiredError'
  }
}

// ----- Usage Limits -----

export interface UsageLimits {
  [key: string]: { free: number; pro: number; period: 'daily' | 'lifetime' }
}

export const FEATURE_LIMITS: UsageLimits = {
  photo_coloring: { free: 3, pro: 50, period: 'daily' },
  dot_to_dot:     { free: 1, pro: 50, period: 'lifetime' },
}

export interface UsageCheckResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  isPro: boolean
}

/**
 * Check whether a user can use a feature, based on their plan and usage.
 */
export async function checkUsage(
  userId: string,
  featureKey: string,
  email?: string | null
): Promise<UsageCheckResult> {
  const plan = await getUserPlan(email)
  const limits = FEATURE_LIMITS[featureKey]

  if (!limits) {
    return { allowed: true, used: 0, limit: 999, remaining: 999, isPro: plan.isPro }
  }

  const maxCount = plan.isPro ? limits.pro : limits.free

  let used: number
  if (limits.period === 'lifetime') {
    const { data } = await supabase.rpc('get_lifetime_usage', {
      p_user_id: userId,
      p_feature_key: featureKey,
    })
    used = data || 0
  } else {
    // Daily count
    const { data } = await supabase
      .from('usage_counters')
      .select('count')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .eq('date', new Date().toISOString().split('T')[0])
      .maybeSingle()
    used = data?.count || 0
  }

  const remaining = Math.max(0, maxCount - used)

  return {
    allowed: remaining > 0,
    used,
    limit: maxCount,
    remaining,
    isPro: plan.isPro,
  }
}

/**
 * Record a usage and check if it was allowed (atomic).
 * Returns false if the user has exceeded their limit.
 */
export async function recordUsage(
  userId: string,
  featureKey: string,
  email?: string | null
): Promise<{ allowed: boolean; newCount: number }> {
  const plan = await getUserPlan(email)
  const limits = FEATURE_LIMITS[featureKey]

  if (!limits) {
    return { allowed: true, newCount: 0 }
  }

  const maxCount = plan.isPro ? limits.pro : limits.free

  const { data, error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_feature_key: featureKey,
    p_max_count: maxCount,
  })

  if (error) {
    console.error('recordUsage error:', error)
    // Fail open for paid users, fail closed for free
    return { allowed: plan.isPro, newCount: 0 }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: row?.allowed ?? true,
    newCount: row?.new_count ?? 0,
  }
}
