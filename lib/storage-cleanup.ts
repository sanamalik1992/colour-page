/**
 * Storage deletion helpers — remove the ACTUAL image files (not just DB rows)
 * for a job. Used by the 48-hour input-photo cleanup cron and by page/account
 * deletion so the privacy policy's "we delete your data" promise is real.
 *
 * These are children's photos: deletion must genuinely remove the files.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Uploads may land in `uploads` (primary) with an `images` fallback; outputs in
// `outputs` with an `images` fallback. Remove from both so nothing is orphaned.
const INPUT_BUCKETS = ['uploads', 'images']
const OUTPUT_BUCKETS = ['outputs', 'images']

// Sentinel written once an input file has been deleted, so the cron never
// reprocesses it and it can never point at a real object again.
export const DELETED_SENTINEL = 'deleted'

function isRealPath(p?: string | null): p is string {
  return !!p && p !== DELETED_SENTINEL && !p.startsWith('topic/')
}

// An uploaded photo plus its HEIC-converted sibling (…/input-conv.png).
export function inputVariants(p?: string | null): string[] {
  if (!isRealPath(p)) return []
  const conv = p.replace(/\.[^./]+$/, '-conv.png')
  return conv !== p ? [p, conv] : [p]
}

// Best-effort remove: try every candidate bucket; removing a non-existent path
// is a harmless no-op. Never throws — deletion must not be blocked by one file.
export async function removeFromBuckets(buckets: string[], paths: string[]): Promise<void> {
  const clean = paths.filter(isRealPath)
  if (!clean.length) return
  for (const bucket of buckets) {
    try {
      await supabase.storage.from(bucket).remove(clean)
    } catch (err) {
      console.error(`storage cleanup: remove from ${bucket} failed`, err)
    }
  }
}

interface JobFiles {
  input_storage_path?: string | null
  output_pdf_path?: string | null
  output_png_path?: string | null
}

// Delete a job's input AND output files (photo_jobs or dot_jobs share the shape).
export async function deleteJobStorage(job: JobFiles): Promise<void> {
  await removeFromBuckets(INPUT_BUCKETS, inputVariants(job.input_storage_path))
  await removeFromBuckets(OUTPUT_BUCKETS, [job.output_pdf_path, job.output_png_path].filter(isRealPath))
}

// Delete only the input photo (used by the retention cron — outputs are kept).
export async function deleteInputStorage(inputPath?: string | null): Promise<void> {
  await removeFromBuckets(INPUT_BUCKETS, inputVariants(inputPath))
}
