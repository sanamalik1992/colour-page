import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let jobId: string | undefined;
  try {
    const body = await request.json();
    jobId = body.jobId;
    if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    await supabase.from("jobs").update({ status: "processing", progress: 10 }).eq("id", jobId);
    const uploadPath = job.upload_path || job.original_path || job.preview_url;
    if (!uploadPath) throw new Error("No upload path");
    let signedUrl: string | null = null;
    const { data: s1 } = await supabase.storage.from("images").createSignedUrl(uploadPath, 3600);
    if (s1?.signedUrl) signedUrl = s1.signedUrl;
    else {
      const { data: s2 } = await supabase.storage.from("uploads").createSignedUrl(uploadPath, 3600);
      signedUrl = s2?.signedUrl || null;
    }
    if (!signedUrl) throw new Error("Failed to get signed URL");
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) throw new Error("REPLICATE_API_TOKEN not configured");
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (!webhookUrl) throw new Error("App URL not configured");
    const fullWebhookUrl = webhookUrl.startsWith("http") ? webhookUrl + "/api/webhooks/replicate" : "https://" + webhookUrl + "/api/webhooks/replicate";
    const complexity = job.complexity || "medium";
    let prompt = "Transform this into a black and white coloring book page. Clean bold black outlines on pure white background. No shading, no gradients, no gray - only pure black lines on white. Professional coloring book style.";
    if (complexity === "simple") prompt = "Transform this into a simple black and white coloring book page for young children. Bold thick black outlines only on pure white background. Large simple shapes.";
    if (complexity === "detailed") prompt = "Transform this into a detailed black and white coloring book page. Clean precise black line art on pure white background. Include fine details. No shading or gradients.";
    const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + replicateToken, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { prompt: prompt, input_image: signedUrl, aspect_ratio: "match_input_image" }, webhook: fullWebhookUrl, webhook_events_filter: ["completed"] })
    });
    if (!res.ok) throw new Error("Failed to create prediction: " + await res.text());
    const prediction = await res.json();
    await supabase.from("jobs").update({ progress: 30, prediction_id: prediction.id }).eq("id", jobId);
    return NextResponse.json({ success: true, status: "processing", predictionId: prediction.id });
  } catch (error) {
    if (jobId) await supabase.from("jobs").update({ status: "failed", error_message: error instanceof Error ? error.message : "Unknown error" }).eq("id", jobId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Processing failed" }, { status: 500 });
  }
}
