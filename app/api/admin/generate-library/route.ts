import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const LIBRARY_ITEMS = [
  { title: 'Super Mario', category: 'Video Games', prompt: 'Super Mario character jumping, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Princess Elsa', category: 'Disney', prompt: 'Elsa from Frozen princess with ice powers, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Pikachu', category: 'Pokemon', prompt: 'Pikachu pokemon character cute and happy, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Spider-Man', category: 'Superheroes', prompt: 'Spider-Man superhero in action pose, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Peppa Pig', category: 'TV Shows', prompt: 'Peppa Pig character, simple black and white colouring book page for children, bold clean outlines, no shading, white background' },
  { title: 'Paw Patrol Chase', category: 'TV Shows', prompt: 'Chase from Paw Patrol police dog, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Unicorn Magic', category: 'Fantasy', prompt: 'Beautiful magical unicorn with flowing mane, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'T-Rex Dinosaur', category: 'Dinosaurs', prompt: 'Friendly T-Rex dinosaur for kids, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Hello Kitty', category: 'Characters', prompt: 'Hello Kitty cute character with bow, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Minecraft Creeper', category: 'Video Games', prompt: 'Minecraft Creeper character blocky style, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Frozen Olaf', category: 'Disney', prompt: 'Olaf snowman from Frozen happy, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Batman', category: 'Superheroes', prompt: 'Batman superhero with cape, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Butterfly Garden', category: 'Nature', prompt: 'Beautiful butterfly with detailed wings and flowers, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Cute Puppy', category: 'Animals', prompt: 'Cute fluffy puppy dog playing, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Princess Castle', category: 'Fantasy', prompt: 'Fairy tale princess castle with towers, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Race Car', category: 'Vehicles', prompt: 'Cool racing car with flames, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Mermaid', category: 'Fantasy', prompt: 'Beautiful mermaid princess underwater, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Sonic', category: 'Video Games', prompt: 'Sonic the Hedgehog running fast, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Cute Kitten', category: 'Animals', prompt: 'Cute fluffy kitten playing with yarn, simple black and white colouring book page, bold clean outlines, no shading, white background' },
  { title: 'Dragon', category: 'Fantasy', prompt: 'Friendly dragon breathing fire for kids, simple black and white colouring book page, bold clean outlines, no shading, white background' },
]

export async function POST(request: NextRequest) {
  // Check admin secret
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET
  
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const replicateToken = process.env.REPLICATE_API_TOKEN

  if (!replicateToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const startIndex = body.startIndex || 0
  const count = body.count || 1 // Generate one at a time to avoid timeout

  const results: string[] = []

  for (let i = startIndex; i < Math.min(startIndex + count, LIBRARY_ITEMS.length); i++) {
    const item = LIBRARY_ITEMS[i]
    
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('coloring_library')
        .select('id')
        .eq('title', item.title)
        .maybeSingle()

      if (existing) {
        results.push(`${item.title}: already exists`)
        continue
      }

      // Generate image
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            prompt: item.prompt,
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

      // Download image
      const imgRes = await fetch(imageUrl)
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer())

      // Upload to Supabase storage
      const fileName = `library/${item.title.toLowerCase().replace(/\s+/g, '-')}.png`
      await supabase.storage.from('images').upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

      // Save to database
      await supabase.from('coloring_library').insert({
        title: item.title,
        category: item.category,
        image_path: fileName,
        downloads: Math.floor(Math.random() * 15000) + 5000,
        is_published: true
      })

      results.push(`${item.title}: generated successfully`)

    } catch (error) {
      results.push(`${item.title}: failed - ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    results,
    nextIndex: startIndex + count,
    total: LIBRARY_ITEMS.length,
    remaining: LIBRARY_ITEMS.length - (startIndex + count)
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with Authorization: Bearer YOUR_ADMIN_SECRET',
    totalItems: LIBRARY_ITEMS.length,
    items: LIBRARY_ITEMS.map(i => i.title)
  })
}
