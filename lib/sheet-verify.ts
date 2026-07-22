import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'

/**
 * FINAL quality gate — looks at the fully-rendered sheet just before it would be
 * delivered and flags CLEAR defects (overlapping/garbled text, unreadable words,
 * blob pictures, content cut off, broken layout). The generation pipeline uses
 * this to refuse to publish a broken sheet.
 *
 * Deliberately strict about DEFECTS only, not subjective quality/style, to avoid
 * bouncing good sheets. Fails OPEN (ok:true) if there's no key, it's disabled,
 * or the call errors/times out — so a QA outage can't block all generation.
 */
export async function verifySheet(buf: Buffer): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || process.env.DISABLE_SHEET_QA === 'true') return { ok: true }

  try {
    const png = await sharp(buf).resize(1000, 1400, { fit: 'inside', background: '#ffffff' }).png().toBuffer()
    const client = new Anthropic({ apiKey })
    const res = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') } },
              {
                type: 'text',
                text:
                  `You are the FINAL quality checker for a children's printable activity/colouring sheet, ` +
                  `just before a paying customer receives it. Flag ONLY clear DEFECTS that make it look ` +
                  `broken or unprofessional: (a) text overlapping itself or other elements so it's ` +
                  `garbled/unreadable, (b) words or letters running into each other, (c) a picture that is ` +
                  `a blob or unrecognisable, (d) content cut off the page edge, (e) badly broken/empty ` +
                  `layout. Do NOT reject for being simple, plain, or a matter of taste — only real defects. ` +
                  `Reply ONLY compact JSON: {"ok": true} if there are no clear defects, or ` +
                  `{"ok": false, "reason": "<short>"} if there is one.`,
              },
            ],
          },
        ],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('sheet QA timeout')), 8000)),
    ])

    const text = res.content.find((c) => c.type === 'text')
    const raw = text && 'text' in text ? text.text : ''
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return { ok: true }
    const parsed = JSON.parse(m[0]) as { ok?: boolean; reason?: string }
    return parsed.ok === false ? { ok: false, reason: parsed.reason || 'defect' } : { ok: true }
  } catch (e) {
    console.error('verifySheet error (failing open):', e instanceof Error ? e.message : e)
    return { ok: true }
  }
}
