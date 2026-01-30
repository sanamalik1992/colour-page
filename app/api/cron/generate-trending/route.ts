import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SAFE_TOPICS = [
  { topic: 'cute baby animals playing together', category: 'Animals', tags: ['animals', 'cute', 'baby'] },
  { topic: 'friendly dinosaur in prehistoric jungle', category: 'Dinosaurs', tags: ['dinosaur', 'prehistoric'] },
  { topic: 'magical unicorn in enchanted forest', category: 'Fantasy', tags: ['unicorn', 'magic'] },
  { topic: 'rocket ship flying through space with planets', category: 'Space', tags: ['space', 'rocket'] },
  { topic: 'underwater ocean scene with fish and coral', category: 'Ocean', tags: ['ocean', 'fish'] },
  { topic: 'race car on racing track', category: 'Vehicles', tags: ['car', 'racing'] },
  { topic: 'butterfly garden with flowers', category: 'Nature', tags: ['butterfly', 'flowers'] },
  { topic: 'friendly robot helper', category: 'Fantasy', tags: ['robot', 'technology'] },
  { topic: 'pirate ship on the ocean with treasure', category: 'Fantasy', tags: ['pirate', 'adventure'] },
  { topic: 'hot air balloon over mountains', category: 'Vehicles', tags: ['balloon', 'flying'] },
]

function buildPrompt(topic: string): string {
  return `Simple black and white colouring page of ${topic}. Clean thin fine outlines only. Pure white background, no shading, no gradients. Child-friendly printable line art.`
}

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim()
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: string[] = []
  const replicateToken = process.env.REPLICATE_API_TOKEN

  if (!replicateToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })
  }

  const shuffled = SAFE_TOPICS.sort(() => Math.random() - 0.5)
  const todaysTopics = shuffled.slice(0, 2)

  for (const item of todaysTopics) {
    const title = item.topic.split(' ').slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const slug = generateSlug(title + ' colouring page')

    const { data: existing } = await supabase
      .from('colouring_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      results.push(`${title}: already exists`)
      continue
    }

    try {
      const prompt = buildPrompt(item.topic)

      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { prompt, num_outputs: 1, aspect_ratio: '3:4', output_format: 'png' }
        })
      })

      if (!res.ok) throw new Error('Failed to start generation')

      const prediction = await res.json()
      let result = prediction
      let attempts = 0
      
      while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: { 'Authorization': `Bearer ${replicateToken}` }
        })
        result = await pollRes.json()
        attempts++
      }

      if (result.status !== 'succeeded') throw new Error('Generation failed')

      const imageUrl = result.output?.[0] || result.output
      if (!imageUrl) throw new Error('No output URL')

      const imgRes = await fetch(imageUrl)
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer())
      const previewPath = `previews/${slug}.png`
      
      await supabase.storage.from('colouring-pages').upload(previewPath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

      await supabase.from('colouring_pages').insert({
        title: title + ' Colouring Page',
        slug,
        description: `Free printable ${title.toLowerCase()} colouring page for kids.`,
        prompt_used: prompt,
        category: item.category,
        tags: item.tags,
        preview_path: previewPath,
        trend_score: Math.floor(Math.random() * 50) + 50,
        is_published: true
      })

      results.push(`${title}: generated successfully`)

    } catch (error) {
      results.push(`${title}: failed - ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({ success: true, generated: results, date: new Date().toISOString() })
}
