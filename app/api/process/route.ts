import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import sharp from "sharp";
import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;
const MARGIN = 120;

/**
 * IMPORTANT:
 * - Do NOT hardcode a Replicate version hash in code.
 * - Default to calling the model WITHOUT a version so Replicate uses latest permitted.
 * - If you want to pin a version, set env REPLICATE_LINEART_VERSION.
 *
 * Recommended defaults:
 *   REPLICATE_LINEART_MODEL="jagilley/controlnet-lineart"
 *   (version optional)
 *
 * If you want to keep your current model name, set:
 *   REPLICATE_LINEART_MODEL="lllyasviel/control_v11p_sd15_lineart"
 * but note: some "control_v11p_*" entries are weights/checkpoints and not always runnable directly.
 */
const REPLICATE_LINEART_MODEL =
  process.env.REPLICATE_LINEART_MODEL?.trim() || "jagilley/controlnet-lineart";

const REPLICATE_LINEART_VERSION =
  process.env.REPLICATE_LINEART_VERSION?.trim() || ""; // optional pinned version id/hash

async function updateJobProgress(
  supabase: SupabaseClient,
  jobId: string,
  progress: number,
  status?: string
) {
  await supabase
    .from("jobs")
    .update({
      progress,
      ...(status && { status }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

/**
 * Strong post-processing to force true “colouring page” output:
 * - Greyscale + normalize
 * - Median to reduce speckle
 * - Threshold to pure black/white
 * - Optional line thickening via morphology-like convolution (simple)
 */
async function cleanupAndFormatColoringPage(inputBuffer: Buffer): Promise<Buffer> {
  console.log("Post-processing: cleaning up coloring page...");

  // Greyscale + normalize contrast
  let processed = await sharp(inputBuffer).greyscale().normalize().toBuffer();

  // Reduce speckles/noise
  processed = await sharp(processed).median(2).toBuffer();

  // Thicken lines slightly (simple 3x3 kernel)
  const dilationKernel = {
    width: 3,
    height: 3,
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    scale: 1,
    offset: 0,
  };

  processed = await sharp(processed).convolve(dilationKernel).toBuffer();

  // Hard threshold (no greys)
  processed = await sharp(processed).threshold(155).toBuffer();

  // Force strict binary pixels
  const { data, info } = await sharp(processed)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = pixels[i] < 128 ? 0 : 255;
  }

  const cleanBuffer = await sharp(Buffer.from(pixels), {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  return cleanBuffer;
}

async function layoutToA4(contentBuffer: Buffer): Promise<Buffer> {
  console.log("Laying out on A4 canvas...");

  const metadata = await sharp(contentBuffer).metadata();

  const maxWidth = A4_WIDTH - MARGIN * 2;
  const maxHeight = A4_HEIGHT - MARGIN * 2;

  let resized = contentBuffer;
  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      resized = await sharp(contentBuffer)
        .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: false })
        .toBuffer();
    }
  }

  const resizedMeta = await sharp(resized).metadata();
  const contentWidth = resizedMeta.width || maxWidth;
  const contentHeight = resizedMeta.height || maxHeight;

  const xOffset = Math.floor((A4_WIDTH - contentWidth) / 2);
  const yOffset = Math.floor((A4_HEIGHT - contentHeight) / 2);

  const a4Page = await sharp({
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
        left: xOffset,
        top: yOffset,
      },
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  return a4Page;
}

/**
 * Extracts a URL from Replicate outputs, which can be:
 * - string
 * - string[]
 * - object with output/image/url fields
 */
function extractFirstImageUrl(output: unknown): string | null {
  if (!output) return null;

  if (typeof output === "string" && output.startsWith("http")) return output;

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item.startsWith("http")) return item;
    }
  }

  if (typeof output === "object") {
    const obj = output as Record<string, unknown>;
    const keysToCheck = ["output", "image", "url", "result"];
    for (const key of keysToCheck) {
      const value = obj[key];
      if (typeof value === "string" && value.startsWith("http")) return value;
      if (Array.isArray(value) && typeof value[0] === "string" && value[0].startsWith("http")) {
        return value[0];
      }
    }
  }

  return null;
}

/**
 * Calls Replicate with:
 * - pinned version if provided
 * - otherwise unpinned model (latest permitted)
 * If pinned version triggers 422 Invalid version/not permitted, it retries unpinned automatically.
 */
async function runReplicateLineart(input: Record<string, unknown>) {
  const modelPinned = REPLICATE_LINEART_VERSION
    ? `${REPLICATE_LINEART_MODEL}:${REPLICATE_LINEART_VERSION}`
    : null;

  try {
    const target = modelPinned || REPLICATE_LINEART_MODEL;
    console.log("Replicate target:", target);
    return await replicate.run(target as any, { input } as any);
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "";
    const isInvalidVersion =
      message.includes("422") &&
      (message.includes("Invalid version") ||
        message.includes("does not exist") ||
        message.includes("not permitted"));

    if (modelPinned && isInvalidVersion) {
      console.warn("Pinned version failed (422). Retrying with unpinned model...");
      return await replicate.run(REPLICATE_LINEART_MODEL as any, { input } as any);
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null;

  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }

    const body = await request.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    console.log("=== STARTING COLORING PAGE PROCESS ===");
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

    await supabase
      .from("jobs")
      .update({
        status: "processing",
        progress: 5,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    const { data: signedUpload } = await supabase.storage
      .from("images")
      .createSignedUrl(job.upload_path, 3600);

    if (!signedUpload?.signedUrl) {
      throw new Error("Failed to get signed upload URL");
    }

    await updateJobProgress(supabase, jobId, 10);

    const isDetailed = job.complexity === "detailed";

    // Prompts tuned for clean kids colouring pages (no speckles, no shading)
    const prompt = isDetailed
      ? "children's coloring book page, clean black ink outlines only, high contrast, white background, smooth continuous lines, detailed but simple enough to color, cartoon line art"
      : "children's coloring book page, very bold thick clean black outlines only, high contrast, white background, simplified cartoon line art, easy for kids to color";

    const negativePrompt =
      "shading, grayscale, pencil texture, sketch, stippling, dots, noise, faded, low contrast, texture, background clutter, photo, realistic, grey tones, gradient, blur, messy, broken lines, thin lines, hatching, crosshatch, watermark, signature, text, letters, numbers, logos, documents, id card";

    /**
     * IMPORTANT:
     * Different Replicate models accept different input keys.
     * Keep inputs minimal + common to avoid 422 input schema errors.
     */
    await updateJobProgress(supabase, jobId, 15, "processing");

    console.log("Calling Replicate lineart model...");

    const replicateInput: Record<string, unknown> = {
      image: signedUpload.signedUrl,
      prompt,
      negative_prompt: negativePrompt,

      // Common SD params (many models accept these; if not, you’ll see a schema error)
      guidance_scale: 9,
      num_inference_steps: 30,

      // Ensure single output
      num_outputs: 1,
    };

    const output = await runReplicateLineart(replicateInput);

    console.log("Replicate generation complete. Output type:", typeof output);
    await updateJobProgress(supabase, jobId, 50);

    const imageUrl = extractFirstImageUrl(output);
    if (!imageUrl) {
      console.error("FAILED TO EXTRACT IMAGE URL");
      console.error("Output:", JSON.stringify(output, null, 2));
      throw new Error("Replicate model did not return a valid image URL");
    }

    console.log("✓ Extracted image URL:", imageUrl);

    await updateJobProgress(supabase, jobId, 55);

    console.log("Downloading generated image...");
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const aiBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await updateJobProgress(supabase, jobId, 60);

    console.log("Post-processing image...");
    const processedBuffer = await cleanupAndFormatColoringPage(aiBuffer);
    await updateJobProgress(supabase, jobId, 75);

    console.log("Laying out to A4...");
    const a4Buffer = await layoutToA4(processedBuffer);
    await updateJobProgress(supabase, jobId, 90);

    const resultFileName = `results/${nanoid()}.png`;
    console.log("Uploading final result:", resultFileName);

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(resultFileName, a4Buffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    await updateJobProgress(supabase, jobId, 98);

    await supabase
      .from("jobs")
      .update({
        status: "completed",
        progress: 100,
        result_url: resultFileName,
        preview_url: resultFileName,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log("=== JOB COMPLETED SUCCESSFULLY ===");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("=== JOB FAILED ===");
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
