import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserPlan } from '@/lib/pro-gating'
import { getServerUser } from '@/lib/supabase/auth-server'
import { packPlan } from '@/lib/topic-prompt'
import { buildComposedSheet, sheetHasAnswers } from '@/lib/topic-render'
import { renderMultiPagePdf, renderA4Preview } from '@/lib/pdf-renderer'
import { findBlockedTerm } from '@/lib/blocklist'
import type { PhotoJobSettings } from '@/types/photo-job'

// Activity packs — a coordinated multi-sheet PDF for one topic+age, generated in
// one click. A Pro Family feature. Every sheet is deterministic (no image model),
// so the whole pack renders inline in a couple of seconds.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function uploadOutput(path: string, buf: Buffer, ct: string) {
  const { error } = await supabase.storage.from('outputs').upload(path, buf, { contentType: ct, upsert: true })
  if (error) await supabase.storage.from('images').upload(path, buf, { contentType: ct, upsert: true })
}
async function signUrl(path: string): Promise<string | null> {
  const a = await supabase.storage.from('outputs').createSignedUrl(path, 3600)
  if (a.data?.signedUrl) return a.data.signedUrl
  const b = await supabase.storage.from('images').createSignedUrl(path, 3600)
  return b.data?.signedUrl || null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const topic = String(body?.topic || '').trim()
    const ageRaw = parseInt(String(body?.age), 10)
    const age = Number.isFinite(ageRaw) ? Math.max(3, Math.min(10, ageRaw)) : undefined
    const childName = body?.childName ? String(body.childName).slice(0, 20) : undefined

    if (!topic) return NextResponse.json({ error: 'Please type a topic for the pack.' }, { status: 400 })
    if (topic.length > 80) return NextResponse.json({ error: 'Please use a shorter topic.' }, { status: 400 })

    // Pro Family only.
    const authed = await getServerUser()
    const email = authed?.email || (body?.email ? String(body.email).toLowerCase() : null)
    const { isPro } = await getUserPlan(email)
    if (!isPro) {
      return NextResponse.json(
        { error: 'Activity packs are a Pro Family feature.', isPro: false, upgrade: true },
        { status: 402 }
      )
    }

    const blocked = await findBlockedTerm(topic)
    if (blocked) {
      return NextResponse.json({ error: `We can't make a pack for "${blocked}". Try a theme like space, animals or letters!` }, { status: 400 })
    }

    const pack = packPlan(topic, age, childName)
    if (!pack || !pack.sheets.length) {
      return NextResponse.json(
        { error: "We don't have a pack for that topic yet — try a letter, times table, fractions, number bonds, shapes, counting or addition.", noPack: true },
        { status: 400 }
      )
    }

    // Render every sheet deterministically (no image model → no genPicture).
    const buffers: Buffer[] = []
    const answerPages: Buffer[] = []
    for (const sheet of pack.sheets) {
      const settings: PhotoJobSettings = {
        orientation: 'portrait',
        lineThickness: sheet.difficulty.lineThickness,
        detailLevel: sheet.difficulty.detailLevel,
        source: 'topic',
      }
      const acts = sheet.activities || []
      buffers.push(await buildComposedSheet(sheet.title, acts, settings))
      // Build an answer page for sheets with computable answers (maths). The
      // same activities + order reproduce the same questions, now with answers.
      if (sheetHasAnswers(acts)) {
        answerPages.push(await buildComposedSheet(`Answers — ${sheet.subject}`, acts, settings, undefined, undefined, true))
      }
    }
    // Answer key pages go at the end of the pack.
    buffers.push(...answerPages)

    // Pro downloads are unbranded, full-DPI.
    const pdf = await renderMultiPagePdf(buffers, { footer: false })
    const preview = await renderA4Preview(buffers[0], false, { hd: true })

    const id = crypto.randomUUID()
    const pdfPath = `packs/${id}/pack.pdf`
    const pngPath = `packs/${id}/cover.png`
    await Promise.all([
      uploadOutput(pdfPath, pdf, 'application/pdf'),
      uploadOutput(pngPath, preview, 'image/png'),
    ])
    const [pdfUrl, pngUrl] = await Promise.all([signUrl(pdfPath), signUrl(pngPath)])

    return NextResponse.json({
      id,
      title: pack.title,
      subject: pack.subject,
      pages: buffers.length,
      answerPages: answerPages.length,
      sheetTitles: pack.sheets.map((s) => s.title),
      pdfUrl,
      coverUrl: pngUrl,
    })
  } catch (error) {
    console.error('Pack create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to make the pack' },
      { status: 500 }
    )
  }
}
