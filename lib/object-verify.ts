import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'

/**
 * Look at a generated object drawing and judge whether a young child would
 * instantly and correctly recognise it, with sensible anatomy — the only
 * reliable way to catch SEMANTIC failures (a snake with eyes outside its body,
 * an unrecognisable "ch" picture) that pixel/ink checks can't see.
 *
 * Fail-OPEN: if there's no API key, the check is disabled, or the call errors,
 * we return true so a transient verifier problem never blocks generation.
 */
export async function verifyObjectImage(buf: Buffer, objectName: string): Promise<boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || process.env.DISABLE_OBJECT_VISION === 'true') return true

  try {
    // Small image keeps the vision call fast and cheap.
    const png = await sharp(buf).resize(512, 512, { fit: 'inside', background: '#ffffff' }).png().toBuffer()
    const client = new Anthropic({ apiKey })
    // Bound the vision call so a slow model response can't stall generation.
    const res = await Promise.race([
      client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') },
            },
            {
              type: 'text',
              text:
                `This black-and-white line drawing is meant to show "${objectName}" on a young child's ` +
                `colouring sheet. Would a 4-6 year old INSTANTLY and correctly recognise it as a ${objectName}, ` +
                `with sensible anatomy — eyes/face/limbs in the right places and joined to the body, nothing ` +
                `floating outside the shape, not a blob or abstract mess? Be strict. ` +
                `Reply ONLY compact JSON: {"ok": true} if it clearly reads as a ${objectName}, else {"ok": false}.`,
            },
          ],
        },
      ],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('vision timeout')), 6000)),
    ])

    const text = res.content.find((c) => c.type === 'text')
    const raw = text && 'text' in text ? text.text : ''
    const match = raw.match(/\{[^}]*\}/)
    if (!match) return true // couldn't parse — don't block
    const parsed = JSON.parse(match[0]) as { ok?: boolean }
    return parsed.ok !== false // explicit false rejects; anything else passes
  } catch (e) {
    console.error('verifyObjectImage error (failing open):', e instanceof Error ? e.message : e)
    return true
  }
}
