import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const maxDuration = 60

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const prediction = await request.json()
    console.log('Webhook received:', prediction.id, prediction.status)

    // Find job by prediction_id
    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("prediction_id", prediction.id)
      .single()

    if (!job) {
      console.log('Job not found for prediction:', prediction.id)
      return NextResponse.json({ received: true, error: "Job not found" })
    }

    const jobId = job.id

    if (prediction.status === "failed") {
      await supabase.from("jobs").update({ 
        status: "failed", 
        error_message: prediction.error || "Generation failed" 
      }).eq("id", jobId)
      return NextResponse.json({ received: true, status: "failed" })
    }

    if (prediction.status === "succeeded") {
      // Get output URL
      const output = prediction.output
      const outputUrl = typeof output === "string" 
        ? output 
        : Array.isArray(output) 
          ? output[0] 
          : output?.url

      if (!outputUrl) {
        throw new Error("No output URL in prediction result")
      }

      console.log('Downloading result from:', outputUrl)
      await supabase.from("jobs").update({ progress: 70 }).eq("id", jobId)

      // Download the image
      const imgRes = await fetch(outputUrl)
      if (!imgRes.ok) throw new Error("Failed to download result image")
      
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer())
      await supabase.from("jobs").update({ progress: 85 }).eq("id", jobId)

      // Upload to storage
      const resultPath = `results/${jobId}.png`
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(resultPath, imageBuffer, { 
          contentType: "image/png", 
          upsert: true 
        })

      if (uploadError) {
        console.log('Trying uploads bucket instead')
        await supabase.storage
          .from("uploads")
          .upload(resultPath, imageBuffer, { 
            contentType: "image/png", 
            upsert: true 
          })
      }

      // Update job as completed
      await supabase.from("jobs").update({ 
        status: "completed", 
        result_url: resultPath, 
        progress: 100, 
        completed_at: new Date().toISOString() 
      }).eq("id", jobId)

      console.log('Job completed:', jobId)
      return NextResponse.json({ received: true, status: "completed" })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ received: true, error: String(error) })
  }
}

export async function GET() {
  return NextResponse.json({ status: "active", message: "Replicate webhook endpoint" })
}
