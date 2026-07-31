import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserPlan } from '@/lib/pro-gating'
import { getServerUser } from '@/lib/supabase/auth-server'
import { packPlan, personalisePack, type Activity } from '@/lib/topic-prompt'
import { aiPlanPack } from '@/lib/topic-ai'
import { buildComposedSheet, sheetHasAnswers } from '@/lib/topic-render'
import { cachedObject } from '@/lib/object-images'
import { renderMultiPagePdf, renderA4Preview } from '@/lib/pdf-renderer'
import { findBlockedTerm } from '@/lib/blocklist'
import type { PhotoJobSettings } from '@/types/photo-job'

// Activity packs — a coordinated multi-sheet PDF for one topic+age, generated in
// one click. A Pro Family feature. Known curriculum topics render deterministically
// (no image model) in a couple of seconds; anything else is designed by the AI
// planner, and picture-themed packs (vegetables, space…) generate a small, shared
// set of colour-in pictures — hence the longer budget.
export const maxDuration = 300

// Cap how many distinct pictures a whole pack ever generates. The AI pack reuses
// ONE shared object set across its sheets, so a handful covers every picture and
// keeps the pack fast and cheap (objects are cached after the first pack).
const MAX_PACK_OBJECTS = 6

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

    // Known curriculum topics get the tuned deterministic pack; everything else
    // is designed by the AI planner so ANY topic yields a real pack, then gets
    // the same name personalisation applied.
    let pack = packPlan(topic, age, childName)
    if (!pack || !pack.sheets.length) {
      const aiBase = await aiPlanPack(topic, age)
      if (aiBase) pack = personalisePack(aiBase, age, childName)
    }
    if (!pack || !pack.sheets.length) {
      return NextResponse.json(
        { error: "We couldn't build a pack for that topic — please try rewording it, or a theme like animals, space or letters.", noPack: true },
        { status: 400 }
      )
    }

    // Some AI packs are picture-themed (colour the vegetables, count the
    // planets…). Those blocks need line-art of the topic's own objects. Generate
    // the pack's SHARED object set ONCE, up front, deduped and capped — then hand
    // every sheet a cache-only lookup so no object is ever generated twice. A
    // deterministic pack has no picture blocks, so this stays a no-op for them.
    const hasReplicate = !!process.env.REPLICATE_API_TOKEN
    const wantedObjects = new Set<string>()
    for (const sheet of pack.sheets) {
      for (const a of sheet.activities || []) {
        if ((a.type === 'pictures' || a.type === 'countPictures') && Array.isArray((a as { items?: string[] }).items)) {
          for (const o of (a as { items: string[] }).items) if (o) wantedObjects.add(o)
        }
      }
    }
    const picMap = new Map<string, Buffer>()
    if (hasReplicate && wantedObjects.size) {
      const objSettings: PhotoJobSettings = { orientation: 'portrait', lineThickness: 'medium', detailLevel: 'medium', source: 'topic' }
      const names = [...wantedObjects].slice(0, MAX_PACK_OBJECTS)
      const results = await Promise.all(names.map((o) => cachedObject(o, objSettings).catch(() => null)))
      names.forEach((o, i) => { if (results[i]) picMap.set(o, results[i]!) })
    }
    // Cache-only lookup: pictures already generated above are reused; anything
    // not pre-generated (over the cap, or gen failed) is simply dropped and the
    // sheet renders without it. Never triggers a fresh model call per sheet.
    const genPicture = picMap.size ? (obj: string) => Promise.resolve(picMap.get(obj) ?? null) : undefined

    // Render every sheet, reusing the shared pictures where a block needs them.
    const buffers: Buffer[] = []
    const answerPages: Buffer[] = []
    for (const sheet of pack.sheets) {
      const settings: PhotoJobSettings = {
        orientation: 'portrait',
        lineThickness: sheet.difficulty.lineThickness,
        detailLevel: sheet.difficulty.detailLevel,
        source: 'topic',
        topic,
        title: sheet.title,
      }
      const acts: Activity[] = sheet.activities || []
      buffers.push(await buildComposedSheet(sheet.title, acts, settings, genPicture))
      // Build an answer page for sheets with computable answers (maths). The
      // same activities + order reproduce the same questions, now with answers.
      if (sheetHasAnswers(acts)) {
        answerPages.push(await buildComposedSheet(`Answers — ${sheet.subject}`, acts, settings, genPicture, undefined, true))
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
