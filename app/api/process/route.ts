import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import sharp from "sharp";
import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";

const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;
const MARGIN = 120;

async function updateJobProgress(
  supabase: SupabaseClient,
  jobId: string,
  progress: number,
  status?: string
): Promise<void> {
  await supabase
    .from("jobs")
    .update({
      progress,
      ...(status ? { status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function cleanupAndFormatColoringPage(
  inputBuffer: Buffer
): Promise<Buffer> {
  let processed = await sharp(inputBuffer).greyscale().normalize().toBuffer();
  processed = await sharp(processed).median(2).toBuffer();
  
  // Thicken lines
  const dilationKernel = {
    width: 3,
    height: 3,
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    scale: 1,
    offset: 0
  };
  
  processed = await sharp(processed).convolve(dilationKernel).toBuffer();
  
  // Hard threshold
  processed = await sharp(processed).threshold(120).toBuffer();

  // Force pure black/white
  const { data, info } = await sharp(processed)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = pixels[i] < 128 ? 0 : 255;
  }

  return sharp(Buffer.from(pixels), {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
}

async function layoutToA4(contentBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(contentBuffer).metadata();
  const maxWidth = A4_WIDTH - MARGIN * 2;
  const maxHeight = A4_HEIGHT - MARGIN * 2;

  let resized = contentBuffer;

  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      resized = await sharp(contentBuffer)
        .resize(maxWidth, maxHeight, { fit: "inside" })
        .toBuffer();
    }
  }

  const resizedMeta = await sharp(resized).metadata();
  const contentWidth = resizedMeta.width || maxWidth;
  const contentHeight = resizedMeta.height || maxHeight;

  return sharp({
    create: {
      width: A4_WIDTH,
      height: A4_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: resized,
        left: Math.floor((A4_WIDTH - contentWidth) / 2),
        top: Math.floor((A4_HEIGHT - contentHeight) / 2),
      },
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null;

  try {
    const body = await request.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    console.log("=== STARTING COLORING PAGE GENERATION ===");
    console.log("Job ID:", jobId);

    const supabase = createServiceClient();

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await updateJobProgress(supabase, jobId, 10, "processing");

    const { data: signedUpload } = await supabase.storage
      .from("images")
      .createSignedUrl(job.upload_path, 3600);

    if (!signedUpload?.signedUrl) {
      throw new Error("Failed to get upload URL");
    }

    await updateJobProgress(supabase, jobId, 20);

    console.log("Calling Replicate AI...");

    // Initialize Replicate client properly
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN || "",
    });

    const isDetailed = job.complexity === "detailed";

    // Use working ControlNet Scribble model
    const output = await replicate.run(
      "jagilley/controlnet-scribble:435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117",
      {
        input: {
          image: signedUpload.signedUrl,
          prompt: isDetailed
            ? "professional children's coloring book page, thick clean black outlines, detailed line art, cartoon style, white background"
            : "simple children's coloring book page, very thick bold black outlines, simple cartoon, white background",
          a_prompt: "best quality, thick black lines, high contrast, clean outlines",
          n_prompt: "shading, grey, sketch, noise, dots, texture, photo, realistic, blur, color, gradient",
          num_samples: "1",
          image_resolution: "768",
          detect_resolution: "768",
          ddim_steps: 25,
          guess_mode: false,
          strength: 1.8,
          scale: 9.0,
          seed: -1,
          eta: 0.0
        }
      }
    );

    console.log("AI output received");
    console.log("Output type:", typeof output);
    
    await updateJobProgress(supabase, jobId, 50);

    // Extract image URL
    let imageUrl: string | undefined;

    if (typeof output === "string") {
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = typeof output[0] === "string" ? output[0] : undefined;
    } else if (output && typeof output === "object") {
      const obj = output as Record<string, unknown>;
      for (const key of ["output", "image", "url", "result"]) {
        const val = obj[key];
        if (typeof val === "string" && val.startsWith("http")) {
          imageUrl = val;
          break;
        }
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
          imageUrl = val[0];
          break;
        }
      }
    }

    if (!imageUrl) {
      console.error("No image URL in output:", output);
      throw new Error("AI did not return image URL");
    }

    console.log("Downloading AI image:", imageUrl);
    
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download: ${imageResponse.statusText}`);
    }

    const aiBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await updateJobProgress(supabase, jobId, 60);

    console.log("Post-processing...");
    const cleaned = await cleanupAndFormatColoringPage(aiBuffer);
    await updateJobProgress(supabase, jobId, 75);

    console.log("Creating A4 layout...");
    const a4 = await layoutToA4(cleaned);
    await updateJobProgress(supabase, jobId, 90);

    const resultPath = `results/${nanoid()}.png`;

    console.log("Uploading result...");
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(resultPath, a4, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    await supabase
      .from("jobs")
      .update({
        status: "completed",
        progress: 100,
        result_url: resultPath,
        preview_url: resultPath,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log("=== COMPLETED SUCCESSFULLY ===");
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("=== PROCESSING FAILED ===");
    console.error("Error:", error);

    if (jobId) {
      const supabase = createServiceClient();
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;