import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INITIAL_PAGES = [
  { title: 'Cute Baby Elephant', category: 'Animals', topic: 'cute baby elephant playing with water' },
  { title: 'Magical Unicorn', category: 'Fantasy', topic: 'magical unicorn with flowing mane and horn' },
  { title: 'Space Rocket Launch', category: 'Space', topic: 'rocket ship launching into space with planets' },
  { title: 'Friendly Dinosaur', category: 'Dinosaurs', topic: 'friendly cartoon dinosaur smiling' },
  { title: 'Ocean Dolphin', category: 'Ocean', topic: 'dolphin jumping out of ocean waves' },
  { title: 'Racing Car', category: 'Vehicles', topic: 'racing car on a racetrack' },
  { title: 'Butterfly Garden', category: 'Nature', topic: 'beautiful butterfly in flower garden' },
  { title: 'Playful Puppy', category: 'Animals', topic: 'cute puppy playing with ball' },
  { title: 'Princess Castle', category: 'Fantasy', topic: 'fairy tale castle with towers and flags' },
  { title: 'Fire Truck Hero', category: 'Vehicles', topic: 'fire truck with firefighter' },
  { title: 'Fluffy Kitten', category: 'Animals', topic: 'fluffy kitten playing with yarn' },
  { title: 'Pirate Adventure', category: 'Fantasy', topic: 'pirate ship sailing on ocean' },
  { title: 'Farm Friends', category: 'Animals', topic: 'farm animals cow pig chicken together' },
  { title: 'Robot Friend', category: 'Fantasy', topic: 'friendly robot waving hello' },
  { title: 'Mermaid Under Sea', category: 'Fantasy', topic: 'beautiful mermaid swimming underwater' },
  { title: 'Jungle Lion', category: 'Animals', topic: 'majestic lion in the jungle' },
  { title: 'Ice Cream Treats', category: 'Food', topic: 'ice cream sundae with toppings' },
  { title: 'Train Journey', category: 'Vehicles', topic: 'train going through mountain scenery' },
  { title: 'Wise Owl', category: 'Animals', topic: 'owl sitting on tree branch at night' },
  { title: 'Dragon Adventure', category: 'Fantasy', topic: 'friendly dragon breathing small flames' },
]

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') + '-colouring-page'
}

function buildPrompt(topic: string): string {
  return `Simple black and white colouring page of ${topic}. Clean thin fine outlines only. Pure white background, no shading, no gradients, no gray tones. Child-friendly printable line art suitable for ages 3-8. Professional colouring book style with delicate lines.`
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const startIndex = body.startIndex || 0
  const count = body.count || 1

  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not set' }, { status: 500 })
  }

  const results: string[] = []

  for (let i = startIndex; i < Math.min(startIndex + count, INITIAL_PAGES.length); i++) {
    const item = INITIAL_PAGES[i]
    const slug = generateSlug(item.title)

    const { data: existing } = await supabase
      .from('colouring_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      results.push(`${item.title}: already exists`)
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

      if (!res.ok) throw new Error('Failed to start')

      const prediction = await res.json()

      let result = prediction
      let attempts = 0
      while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 60) {
        await new Promise(r => setTimeout(r, 2000))
        const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: { 'Authorization': `Bearer ${replicateToken}` }
        })
        result = await poll.json()
        attempts++
      }

      if (result.status !== 'succeeded') throw new Error('Generation failed')

      const imageUrl = result.output?.[0] || result.output
      if (!imageUrl) throw new Error('No output')

      const imgRes = await fetch(imageUrl)
      const buffer = Buffer.from(await imgRes.arrayBuffer())
      const path = `previews/${slug}.png`

      await supabase.storage.from('colouring-pages').upload(path, buffer, {
        contentType: 'image/png',
        upsert: true
      })

      await supabase.from('colouring_pages').insert({
        title: item.title + ' Colouring Page',
        slug,
        description: `Free printable ${item.title.toLowerCase()} colouring page for kids.`,
        prompt_used: prompt,
        category: item.category,
        tags: [item.category.toLowerCase(), 'kids', 'printable'],
        preview_path: path,
        trend_score: Math.floor(Math.random() * 50) + 50,
        download_count: Math.floor(Math.random() * 5000) + 1000,
        is_published: true
      })

      results.push(`${item.title}: success`)

    } catch (err) {
      results.push(`${item.title}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  return NextResponse.json({
    results,
    nextIndex: startIndex + count,
    remaining: INITIAL_PAGES.length - (startIndex + count)
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'POST with Authorization: Bearer ADMIN_SECRET',
    totalPages: INITIAL_PAGES.length,
    pages: INITIAL_PAGES.map(p => p.title)
  })
}
