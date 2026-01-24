import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import Replicate from "replicate";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for processing

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
        .update({
          status: "failed",
          error_message: "No upload path on job",
        })
        .eq("id", jobId);

      return NextResponse.json({ error: "No upload path on job" }, { status: 500 });
    }

    // Get a signed URL for the uploaded image (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("images")
      .createSignedUrl(uploadPath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "Failed to create signed URL for image",
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "Failed to create signed URL" },
        { status: 500 }
      );
    }

    const imageUrl = signedUrlData.signedUrl;

    // Update progress
    await supabase
      .from("jobs")
      .update({ progress: 25 })
      .eq("id", jobId);

    if (!process.env.REPLICATE_API_TOKEN) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "REPLICATE_API_TOKEN not configured",
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Update progress - starting AI processing
    await supabase
      .from("jobs")
      .update({ progress: 40 })
      .eq("id", jobId);

    // Determine preprocessor based on complexity setting
    // "simple" = lineart_coarse (bolder, fewer details - easier for kids)
    // "detailed" = lineart_realistic (more detail)
    const preprocessor = job.complexity === "detailed" 
      ? "lineart_realistic" 
      : "lineart_coarse";

    console.log(`Processing job ${jobId} with preprocessor: ${preprocessor}`);
    console.log(`Image URL: ${imageUrl.substring(0, 100)}...`);

    // Use fofr/controlnet-preprocessors with lineart mode
    // Using the model name without version hash - Replicate will use latest
    const output = await replicate.run(
      "fofr/controlnet-preprocessors" as `${string}/${string}`,
      {
        input: {
          image: imageUrl,
          preprocessor: preprocessor,
          resolution: 1024,
        },
      }
    );

    console.log("Replicate output:", typeof output, output);

    // Update progress
    await supabase
      .from("jobs")
      .update({ progress: 70 })
      .eq("id", jobId);

    // Get the output URL (Replicate returns a URL or array of URLs)
    let outputUrl: string | undefined;
    
    if (typeof output === "string") {
      outputUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      outputUrl = output[0];
    } else if (output && typeof output === "object" && "output" in output) {
      const innerOutput = (output as { output: unknown }).output;
      outputUrl = Array.isArray(innerOutput) ? innerOutput[0] : String(innerOutput);
    }

    if (!outputUrl || typeof outputUrl !== "string") {
      console.error("Invalid output from Replicate:", output);
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: `Replicate returned invalid output: ${JSON.stringify(output)}`,
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "Replicate returned no image" },
        { status: 500 }
      );
    }

    console.log("Downloading from:", outputUrl.substring(0, 100));

    // Download the processed image from Replicate
    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: `Failed to download processed image: ${imageResponse.status}`,
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "Failed to download processed image" },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Update progress
    await supabase
      .from("jobs")
      .update({ progress: 85 })
      .eq("id", jobId);

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
        .update({
          status: "failed",
          error_message: `Failed to upload result: ${uploadError.message}`,
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "Failed to upload result image" },
        { status: 500 }
      );
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

    console.log(`Job ${jobId} completed successfully`);

    return NextResponse.json({ success: true, jobId, resultPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("AI convert error:", error);
    
    // Try to update job status to failed
    if (jobId) {
      try {
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: message,
          })
          .eq("id", jobId);
      } catch (updateError) {
        console.error("Failed to update job status:", updateError);
      }
    }

    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}