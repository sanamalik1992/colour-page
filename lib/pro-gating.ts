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

  try {
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
  } catch {
    return { isPro: false, email: email.toLowerCase(), stripeCustomerId: null }
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
  [key: string]: { free: number; pro: number; period: 'daily' }
}

export const FEATURE_LIMITS: UsageLimits = {
  photo_coloring: { free: 3, pro: 50, period: 'daily' },
  dot_to_dot:     { free: 1, pro: 50, period: 'daily' },
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
 * Falls back to allowing the action if usage tracking tables are unavailable.
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

  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('usage_counters')
      .select('count')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .eq('date', today)
      .maybeSingle()

    if (error) {
      console.error('checkUsage query error:', error)
      // Fail open — let the user proceed
      return { allowed: true, used: 0, limit: maxCount, remaining: maxCount, isPro: plan.isPro }
    }

    const used = data?.count || 0
    const remaining = Math.max(0, maxCount - used)

    return {
      allowed: remaining > 0,
      used,
      limit: maxCount,
      remaining,
      isPro: plan.isPro,
    }
  } catch (err) {
    console.error('checkUsage error:', err)
    // Fail open
    return { allowed: true, used: 0, limit: maxCount, remaining: maxCount, isPro: plan.isPro }
  }
}

/**
 * Record a usage and check if it was allowed.
 * Uses upsert on the usage_counters table directly — no RPC needed.
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
  const today = new Date().toISOString().split('T')[0]

  try {
    // Get current count
    const { data: existing } = await supabase
      .from('usage_counters')
      .select('count')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .eq('date', today)
      .maybeSingle()

    const currentCount = existing?.count || 0

    if (currentCount >= maxCount) {
      return { allowed: false, newCount: currentCount }
    }

    // Upsert: insert or update the counter
    const { error } = await supabase
      .from('usage_counters')
      .upsert(
        {
          user_id: userId,
          feature_key: featureKey,
          date: today,
          count: currentCount + 1,
        },
        { onConflict: 'user_id,feature_key,date' }
      )

    if (error) {
      console.error('recordUsage upsert error:', error)
      // Fail open for paid users, fail closed for free
      return { allowed: plan.isPro, newCount: currentCount }
    }

    return { allowed: true, newCount: currentCount + 1 }
  } catch (err) {
    console.error('recordUsage error:', err)
    return { allowed: plan.isPro, newCount: 0 }
  }
}
