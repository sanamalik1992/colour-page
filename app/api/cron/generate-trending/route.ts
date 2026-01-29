import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Categories for colouring pages
const CATEGORIES = ['Animals', 'Vehicles', 'Fantasy', 'Nature', 'Food', 'Sports', 'Space', 'Ocean', 'Dinosaurs', 'Seasonal']

// Safe, generic trending topics (rotated daily)
const SAFE_TOPICS = [
  { topic: 'cute baby animals playing together', category: 'Animals', tags: ['animals', 'cute', 'baby'] },
  { topic: 'friendly dinosaur in prehistoric jungle', category: 'Dinosaurs', tags: ['dinosaur', 'prehistoric', 'jungle'] },
  { topic: 'magical unicorn in enchanted forest', category: 'Fantasy', tags: ['unicorn', 'magic', 'fantasy'] },
  { topic: 'rocket ship flying through space with planets', category: 'Space', tags: ['space', 'rocket', 'planets'] },
  { topic: 'underwater ocean scene with fish and coral', category: 'Ocean', tags: ['ocean', 'fish', 'underwater'] },
  { topic: 'race car on racing track', category: 'Vehicles', tags: ['car', 'racing', 'vehicles'] },
  { topic: 'butterfly garden with flowers', category: 'Nature', tags: ['butterfly', 'flowers', 'garden'] },
  { topic: 'friendly robot helper', category: 'Fantasy', tags: ['robot', 'technology', 'friendly'] },
  { topic: 'pirate ship on the ocean with treasure', category: 'Fantasy', tags: ['pirate', 'ship', 'adventure'] },
  { topic: 'hot air balloon over mountains', category: 'Vehicles', tags: ['balloon', 'flying', 'adventure'] },
  { topic: 'cute puppy playing with ball', category: 'Animals', tags: ['dog', 'puppy', 'pets'] },
  { topic: 'fluffy kitten with yarn', category: 'Animals', tags: ['cat', 'kitten', 'pets'] },
  { topic: 'majestic lion king of the jungle', category: 'Animals', tags: ['lion', 'jungle', 'wild'] },
  { topic: 'beautiful mermaid underwater castle', category: 'Fantasy', tags: ['mermaid', 'ocean', 'fantasy'] },
  { topic: 'dragon breathing fire over castle', category: 'Fantasy', tags: ['dragon', 'castle', 'fantasy'] },
  { topic: 'princess in beautiful ball gown', category: 'Fantasy', tags: ['princess', 'fairy tale', 'dress'] },
  { topic: 'superhero flying through city', category: 'Fantasy', tags: ['superhero', 'hero', 'city'] },
  { topic: 'farm scene with barn and animals', category: 'Animals', tags: ['farm', 'animals', 'countryside'] },
  { topic: 'train going through mountains', category: 'Vehicles', tags: ['train', 'mountains', 'travel'] },
  { topic: 'ice cream sundae with toppings', category: 'Food', tags: ['ice cream', 'dessert', 'food'] },
  { topic: 'birthday cake with candles', category: 'Food', tags: ['cake', 'birthday', 'celebration'] },
  { topic: 'tropical beach with palm trees', category: 'Nature', tags: ['beach', 'summer', 'tropical'] },
  { topic: 'camping tent under stars', category: 'Nature', tags: ['camping', 'outdoors', 'stars'] },
  { topic: 'treehouse in big oak tree', category: 'Nature', tags: ['treehouse', 'tree', 'adventure'] },
  { topic: 'fire truck with firefighters', category: 'Vehicles', tags: ['fire truck', 'firefighter', 'rescue'] },
  { topic: 'construction digger and dump truck', category: 'Vehicles', tags: ['construction', 'digger', 'trucks'] },
  { topic: 'helicopter flying over city', category: 'Vehicles', tags: ['helicopter', 'flying', 'city'] },
  { topic: 'sailboat on calm ocean', category: 'Vehicles', tags: ['boat', 'sailing', 'ocean'] },
  { topic: 'owl sitting on tree branch at night', category: 'Animals', tags: ['owl', 'night', 'bird'] },
  { topic: 'penguin family on ice', category: 'Animals', tags: ['penguin', 'ice', 'arctic'] },
]

// Prompt template for colouring pages
function buildPrompt(topic: string): string {
  return `Simple black and white colouring page of ${topic}. Clean thin fine outlines only, no thick bold lines. Pure white background, no shading, no gradients, no gray tones. Child-friendly printable line art suitable for ages 3-8. Professional colouring book style.`
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: string[] = []
  const replicateToken = process.env.REPLICATE_API_TOKEN

  if (!replicateToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })
  }

  // Get current seasonal events
  const today = new Date().toISOString().split('T')[0]
  const { data: seasonalEvents } = await supabase
    .from('seasonal_events')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  // Combine seasonal with safe topics
  const topicsToGenerate = [
    ...(seasonalEvents || []).map(e => ({
      topic: e.safe_prompt,
      category: e.category,
      tags: [e.name.toLowerCase(), 'seasonal']
    })),
    ...SAFE_TOPICS
  ]

  // Pick 3 random topics to generate today
  const shuffled = topicsToGenerate.sort(() => Math.random() - 0.5)
  const todaysTopics = shuffled.slice(0, 3)

  for (const item of todaysTopics) {
    const title = item.topic.split(' ').slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const slug = generateSlug(title + ' colouring page')

    // Check if already exists
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

      // Generate image
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            prompt: prompt,
            num_outputs: 1,
            aspect_ratio: '3:4',
            output_format: 'png'
          }
        })
      })

      if (!res.ok) throw new Error('Failed to start generation')

      const prediction = await res.json()

      // Poll for completion
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

      // Download and upload to Supabase
      const imgRes = await fetch(imageUrl)
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer())

      const previewPath = `previews/${slug}.png`
      await supabase.storage.from('colouring-pages').upload(previewPath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

      // Save to database
      await supabase.from('colouring_pages').insert({
        title: title + ' Colouring Page',
        slug,
        description: `Free printable ${title.toLowerCase()} colouring page for kids. Download and print this fun colouring sheet.`,
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

  return NextResponse.json({
    success: true,
    generated: results,
    date: new Date().toISOString()
  })
}
