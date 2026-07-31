/**
 * Shared object line-art generation.
 *
 * Turns a drawable noun ("cat", "carrot", "rocket") into a clean colouring-book
 * line-art PNG, with a Supabase-backed cache, a bounded concurrency pool and a
 * per-object deadline so one slow object can never stall a whole sheet/pack.
 *
 * Extracted from the photo-jobs process route so BOTH the single-sheet pipeline
 * and the activity-pack builder can render the topic's own pictures from the one
 * tuned, cached implementation (no duplication, no drift).
 */
import { createClient } from '@supabase/supabase-js'
import { generateFromTextOnce, scoreObject, hasDarkSurround } from '@/lib/image-processing'
import { verifyObjectImage } from '@/lib/object-verify'
import { singleObjectPrompt } from '@/lib/topic-prompt'
import type { PhotoJobSettings } from '@/types/photo-job'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Object line-art cache. The same nouns recur across sheets (cat, moon, lion…),
// and singleObjectPrompt is settings-independent, so we key purely on the object
// name and reuse a stored PNG — turning a multi-second Replicate call into an
// instant download. The library warms itself as new objects are requested.
export function objectCacheKey(obj: string): string {
  const slug = obj.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  // v3 namespace: forces a one-time re-generation of every object through the
  // dark-background/border gate (added after the "caterpillar in a black box"
  // report), so any previously-cached bad blob is left behind.
  return `object-cache/v3/${slug || 'obj'}.png`
}

// Hard per-object budget. Objects generate in parallel, so ANY single object
// that stalls would freeze the whole sheet's progress — this caps each one and
// drops it (renders without it) rather than letting it hang the job. Kept tight
// (not 40s+): one slow object should drop and let the sheet finish, not hold the
// progress bar near the top for the better part of a minute.
const OBJECT_DEADLINE_MS = 24_000

function withObjectDeadline<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    work,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

// Generate one object. Retries are driven ONLY by the cheap, deterministic ink
// filter (blank/blob) — up to 2 single flux attempts, no nested retry storms.
// The vision recognisability check then runs ONCE on the chosen image and, on a
// miss, DROPS the picture (the sheet renders without it) rather than paying for
// another full Flux round. That removes the hidden 2×-Flux latency multiplier
// that made broad topics crawl, while still keeping garbled pictures off the
// sheet. Vision self-timeouts and fails open, so a QA outage can't block gen.
async function generateOneObject(obj: string, settings: PhotoJobSettings, key: string): Promise<Buffer | null> {
  const prompt = singleObjectPrompt(obj)
  let chosen: Buffer | null = null
  for (let i = 0; i < 2; i++) {
    let buf: Buffer
    try {
      buf = await generateFromTextOnce(prompt, settings)
    } catch (e) {
      console.error(`object "${obj}" generation failed (attempt ${i + 1}):`, e)
      continue
    }
    const { usable } = await scoreObject(buf)
    if (!usable) continue // blank/blob — cheap retry
    // Reject a dark background or black box/border and try again. If every
    // attempt is bordered we return null below and the sheet renders WITHOUT
    // this picture — a clean gap beats a broken-looking black box.
    if (await hasDarkSurround(buf)) { console.warn(`object "${obj}" has a dark background/border — regenerating`); continue }
    chosen = buf
    break
  }
  if (!chosen) return null
  const recognisable = await verifyObjectImage(chosen, obj)
  if (!recognisable) { console.log(`object "${obj}" failed vision — dropping (no re-gen)`); return null }
  supabase.storage.from('outputs').upload(key, chosen, { contentType: 'image/png', upsert: true }).catch(() => {})
  return chosen
}

// Limit how many objects GENERATE at once. Firing every object in parallel
// floods Replicate + the vision model, they queue on the providers, and the job
// stalls near the end. A pool of 4 matches the 4-object sheet cap so a typical
// sheet runs as ONE wave (object PNGs are small, so this is memory-safe), while
// still bounding a pathological fan-out. Cache hits bypass the pool (instant).
const GEN_CONCURRENCY = 4
let genActive = 0
const genWaiters: Array<() => void> = []
function acquireGenSlot(): Promise<void> {
  return new Promise((resolve) => {
    const attempt = () => {
      if (genActive < GEN_CONCURRENCY) { genActive++; resolve() }
      else genWaiters.push(attempt)
    }
    attempt()
  })
}
function releaseGenSlot() {
  genActive = Math.max(0, genActive - 1)
  const next = genWaiters.shift()
  if (next) next()
}

async function downloadCachedObject(key: string): Promise<Buffer | null> {
  try {
    const { data } = await supabase.storage.from('outputs').download(key)
    if (data) return Buffer.from(await data.arrayBuffer())
  } catch { /* miss */ }
  return null
}

// Resolve one object to a line-art buffer: cache read first (bounded), else a
// pooled generation under the per-object deadline. Returns null if it can't be
// produced in time — the caller renders the sheet without that picture.
export async function cachedObject(obj: string, settings: PhotoJobSettings): Promise<Buffer | null> {
  const t0 = Date.now()
  const key = objectCacheKey(obj)
  // Cache read bounded on its own (the storage download has no timeout).
  const hit = await withObjectDeadline(downloadCachedObject(key), 8000)
  if (hit) { console.log(`[timing] object "${obj}" ${Date.now() - t0}ms cache-hit`); return hit }
  // Generate under a concurrency slot: the queue wait is bounded by the whole-
  // job deadline, the generation itself by the per-object deadline.
  await acquireGenSlot()
  try {
    const buf = await withObjectDeadline(generateOneObject(obj, settings, key), OBJECT_DEADLINE_MS)
    console.log(`[timing] object "${obj}" ${Date.now() - t0}ms ${buf ? 'gen-ok' : 'dropped'}`)
    return buf
  } finally {
    releaseGenSlot()
  }
}
