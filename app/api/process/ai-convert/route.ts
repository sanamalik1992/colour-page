import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const maxDuration = 300

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  let jobId: string | undefined

  try {
    const body = await request.json()
    jobId = body.jobId
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single()
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    await supabase.from("jobs").update({ status: "processing", progress: 10 }).eq("id", jobId)

    const uploadPath = job.upload_path || job.original_path || job.preview_url
    if (!uploadPath) throw new Error("No upload path found")

    let signedUrl: string | null = null
    const { data: s1 } = await supabase.storage.from("images").createSignedUrl(uploadPath, 3600)
    if (s1?.signedUrl) {
      signedUrl = s1.signedUrl
    } else {
      const { data: s2 } = await supabase.storage.from("uploads").createSignedUrl(uploadPath, 3600)
      signedUrl = s2?.signedUrl || null
    }

    if (!signedUrl) throw new Error("Failed to get signed URL for image")

    const replicateToken = process.env.REPLICATE_API_TOKEN
    if (!replicateToken) throw new Error("REPLICATE_API_TOKEN not configured")

    // Updated prompt for MEDIUM weight lines - not too thin, not too thick
    const complexity = job.complexity || "medium"
    let prompt = "Transform this image into a clean black and white colouring book page with medium-weight black outlines. Use clear, consistent line thickness suitable for colouring - not too thin and not too thick. Pure white background, no shading, no gradients, no gray tones. Professional colouring book style with clean readable lines that children can easily colour within."
    
    if (complexity === "simple") {
      prompt = "Transform this into a simple black and white colouring book page for young children. Use medium-weight black outlines that are easy to see and colour within. Pure white background, simple shapes with clear readable lines. No shading, no gradients. Kid-friendly colouring book style."
    } else if (complexity === "detailed") {
      prompt = "Transform this into a detailed black and white colouring book page with medium-weight black line art. Use consistent line thickness throughout - clear and visible but not overly bold. Pure white background with intricate details. No shading or gradients, only clean black lines on white. Professional colouring book quality."
    }

    await supabase.from("jobs").update({ progress: 20 }).eq("id", jobId)

    const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${replicateToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          input_image: signedUrl,
          aspect_ratio: "3:4"
        }
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Replicate error: ${errorText}`)
    }

    const prediction = await res.json()
    await supabase.from("jobs").update({ progress: 30, prediction_id: prediction.id }).eq("id", jobId)

    let result = prediction
    let attempts = 0
    const maxAttempts = 120

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      attempts++
      
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${replicateToken}` }
      })
      result = await pollRes.json()
      
      const progress = Math.min(30 + Math.floor(attempts * 0.4), 80)
      await supabase.from("jobs").update({ progress }).eq("id", jobId)
    }

    if (result.status === 'failed') throw new Error(result.error || 'Generation failed')
    if (result.status !== 'succeeded') throw new Error('Generation timed out - please try again')

    const output = result.output
    const outputUrl = typeof output === "string" ? output : Array.isArray(output) ? output[0] : output?.url
    if (!outputUrl) throw new Error("No output URL")

    await supabase.from("jobs").update({ progress: 85 }).eq("id", jobId)

    const imgRes = await fetch(outputUrl)
    if (!imgRes.ok) throw new Error("Failed to download result")
    
    const imageBuffer = Buffer.from(await imgRes.arrayBuffer())
    const resultPath = `results/${jobId}.png`
    
    await supabase.from("jobs").update({ progress: 95 }).eq("id", jobId)

    const { error: uploadError } = await supabase.storage.from("images").upload(resultPath, imageBuffer, { contentType: "image/png", upsert: true })
    if (uploadError) {
      await supabase.storage.from("uploads").upload(resultPath, imageBuffer, { contentType: "image/png", upsert: true })
    }

    await supabase.from("jobs").update({ 
      status: "completed", 
      result_url: resultPath, 
      progress: 100, 
      completed_at: new Date().toISOString() 
    }).eq("id", jobId)

    return NextResponse.json({ success: true, status: "completed" })

  } catch (error) {
    console.error('AI convert error:', error)
    if (jobId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      await supabase.from("jobs").update({ 
        status: "failed", 
        error_message: error instanceof Error ? error.message : "Unknown error" 
      }).eq("id", jobId)
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Processing failed" }, { status: 500 })
  }
}
