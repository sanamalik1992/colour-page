import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import Replicate from "replicate";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = supabaseAdmin;
  let jobId: string | undefined;

  try {
    const body = await request.json().catch(() => ({}));
    jobId = body?.jobId;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const { data: job, error: fetchError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({
        status: job.status,
        message: "Job already processed",
      });
    }

    // Mark as processing
    await supabase
      .from("jobs")
      .update({ status: "processing", progress: 10, error_message: null })
      .eq("id", jobId);

    const uploadPath: string | undefined = job.upload_path || job.preview_url;

    if (!uploadPath) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "No upload path on job" })
        .eq("id", jobId);
      return NextResponse.json({ error: "No upload path on job" }, { status: 500 });
    }

    // Get a signed URL for the uploaded image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("images")
      .createSignedUrl(uploadPath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "Failed to create signed URL" })
        .eq("id", jobId);
      return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
    }

    const imageUrl = signedUrlData.signedUrl;

    await supabase.from("jobs").update({ progress: 20 }).eq("id", jobId);

    if (!process.env.REPLICATE_API_TOKEN) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "REPLICATE_API_TOKEN not configured" })
        .eq("id", jobId);
      return NextResponse.json({ error: "Replicate API token not configured" }, { status: 500 });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    await supabase.from("jobs").update({ progress: 30 }).eq("id", jobId);

    console.log(`Job ${jobId}: Converting photo to line art with Nano Banana...`);

    // Determine detail level based on complexity
    const detailPrompt = job.complexity === "detailed"
      ? "Convert this photo into a detailed black and white line art drawing suitable for a coloring book. Use clean, precise outlines with fine details. Pure black lines on pure white background. No shading, no gradients, no gray tones. Professional coloring page style."
      : "Convert this photo into a simple black and white line art drawing suitable for a children's coloring book. Use bold, thick outlines with minimal details. Pure black lines on pure white background. No shading, no gradients, no gray tones. Easy for kids to color.";

    // Use Google Nano Banana for high-quality image editing/style transfer
    const output = await replicate.run(
      "google/nano-banana" as `${string}/${string}`,
      {
        input: {
          image: imageUrl,
          prompt: detailPrompt,
        },
      }
    );

    await supabase.from("jobs").update({ progress: 70 }).eq("id", jobId);

    // Handle output - could be string URL or array
    let outputUrl: string | undefined;
    if (typeof output === "string") {
      outputUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      outputUrl = output[0] as string;
    } else if (output && typeof output === "object") {
      // Some models return {output: "url"} or similar
      const outputObj = output as Record<string, unknown>;
      if (typeof outputObj.output === "string") {
        outputUrl = outputObj.output;
      } else if (Array.isArray(outputObj.output)) {
        outputUrl = outputObj.output[0] as string;
      }
    }

    if (!outputUrl) {
      console.error("Unexpected output format:", output);
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "Model returned unexpected output format" })
        .eq("id", jobId);
      return NextResponse.json({ error: "Model returned unexpected output" }, { status: 500 });
    }

    console.log(`Job ${jobId}: Downloading result from ${outputUrl.substring(0, 50)}...`);

    // Download the generated image
    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "Failed to download generated image" })
        .eq("id", jobId);
      return NextResponse.json({ error: "Failed to download generated image" }, { status: 500 });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    await supabase.from("jobs").update({ progress: 85 }).eq("id", jobId);

    // Store result in Supabase Storage
    const resultPath = `results/${nanoid()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(resultPath, imageBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: `Failed to upload result: ${uploadError.message}` })
        .eq("id", jobId);
      return NextResponse.json({ error: "Failed to upload result image" }, { status: 500 });
    }

    // Mark job complete
    await supabase
      .from("jobs")
      .update({
        status: "completed",
        result_url: resultPath,
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`Job ${jobId}: Completed successfully!`);

    return NextResponse.json({ success: true, jobId, resultPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("AI convert error:", error);

    if (jobId) {
      try {
        await supabase
          .from("jobs")
          .update({ status: "failed", error_message: message })
          .eq("id", jobId);
      } catch {
        // Ignore errors when updating job status
      }
    }

    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
