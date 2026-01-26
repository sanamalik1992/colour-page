import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const maxDuration = 30;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const prediction = await request.json();
    const { data: job } = await supabase.from("jobs").select("*").eq("prediction_id", prediction.id).single();
    if (!job) return NextResponse.json({ received: true, error: "Job not found" });
    const jobId = job.id;
    if (prediction.status === "failed") {
      await supabase.from("jobs").update({ status: "failed", error_message: prediction.error || "Failed" }).eq("id", jobId);
      return NextResponse.json({ received: true, status: "failed" });
    }
    if (prediction.status === "succeeded") {
      const output = prediction.output;
      let outputUrl: string | null = null;
      if (output && typeof output === "object" && output.lineart) {
        outputUrl = output.lineart;
      } else if (typeof output === "string") {
        outputUrl = output;
      } else if (Array.isArray(output) && output.length > 0) {
        outputUrl = output[0];
      }
      if (!outputUrl) throw new Error("No output URL found");
      await supabase.from("jobs").update({ progress: 70 }).eq("id", jobId);
      const imgRes = await fetch(outputUrl);
      const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
      
      const processedBuffer = await sharp(rawBuffer)
        .negate()
        .grayscale()
        .normalize()
        .linear(1.2, 0)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();

      await supabase.from("jobs").update({ progress: 85 }).eq("id", jobId);
      const resultPath = "results/" + jobId + ".png";
      const { error: e1 } = await supabase.storage.from("images").upload(resultPath, processedBuffer, { contentType: "image/png", upsert: true });
      if (e1) await supabase.storage.from("uploads").upload(resultPath, processedBuffer, { contentType: "image/png", upsert: true });
      await supabase.from("jobs").update({ status: "completed", result_url: resultPath, progress: 100, completed_at: new Date().toISOString() }).eq("id", jobId);
      return NextResponse.json({ received: true, status: "completed" });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true, error: String(error) });
  }
}

export async function GET() {
  return NextResponse.json({ status: "active" });
}
