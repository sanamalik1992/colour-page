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

const REPLICATE_LINEART_MODEL =
  process.env.REPLICATE_LINEART_MODEL?.trim() || "jagilley/controlnet-lineart";

const REPLICATE_LINEART_VERSION =
  process.env.REPLICATE_LINEART_VERSION?.trim() || "";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

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
  processed = await sharp(processed).threshold(155).toBuffer();

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

function extractFirstImageUrl(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("http")) return output;

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item.startsWith("http")) return item;
    }
  }

  if (typeof output === "object" && output !== null) {
    const obj = output as Record<string, unknown>;
    for (const key of ["output", "image", "url", "result"]) {
      const value = obj[key];
      if (typeof value === "string" && value.startsWith("http")) return value;
      if (
        Array.isArray(value) &&
        typeof value[0] === "string" &&
        value[0].startsWith("http")
      ) {
        return value[0];
      }
    }
  }

  return null;
}

type ReplicateRunFn = (
  model: string,
  options: { input: Record<string, unknown> }
) => Promise<unknown>;

async function replicateRun(
  model: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const run = replicate.run as unknown as ReplicateRunFn;
  return run(model, { input });
}

async function runReplicateLineart(
  input: Record<string, unknown>
): Promise<unknown> {
  if (REPLICATE_LINEART_VERSION) {
    try {
      return await replicateRun(
        `${REPLICATE_LINEART_MODEL}:${REPLICATE_LINEART_VERSION}`,
        input
      );
    } catch (err: unknown) {
      const msg = getErrorMessage(err).toLowerCase();
      if (msg.includes("422")) {
        return replicateRun(REPLICATE_LINEART_MODEL, input);
      }
      throw err;
    }
  }
  return replicateRun(REPLICATE_LINEART_MODEL, input);
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null;

  try {
    const bodyUnknown: unknown = await request.json();
    const body =
      typeof bodyUnknown === "object" && bodyUnknown !== null
        ? (bodyUnknown as Record<string, unknown>)
        : {};

    jobId = typeof body.jobId === "string" ? body.jobId : null;
    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await updateJobProgress(supabase, jobId, 10, "processing");

    const { data: signedUpload } = await supabase.storage
      .from("images")
      .createSignedUrl(job.upload_path, 3600);

    if (!signedUpload?.signedUrl) {
      throw new Error("Failed to fetch upload image");
    }

    const replicateInput: Record<string, unknown> = {
      image: signedUpload.signedUrl,
      prompt:
        "children's colouring book page, bold clean black outlines, white background, cartoon line art",
      negative_prompt:
        "shading, grey, sketch, noise, dots, texture, photo, text, watermark",
      guidance_scale: 9,
      num_inference_steps: 30,
      num_outputs: 1,
    };

    const output = await runReplicateLineart(replicateInput);
    const imageUrl = extractFirstImageUrl(output);

    if (!imageUrl) {
      throw new Error("Replicate returned no image");
    }

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const cleaned = await cleanupAndFormatColoringPage(buffer);
    const a4 = await layoutToA4(cleaned);

    const resultPath = `results/${nanoid()}.png`;

    await supabase.storage.from("images").upload(resultPath, a4, {
      contentType: "image/png",
    });

    await supabase
      .from("jobs")
      .update({
        status: "completed",
        progress: 100,
        result_url: resultPath,
        preview_url: resultPath,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (jobId) {
      const supabase = createServiceClient();
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: getErrorMessage(err),
        })
        .eq("id", jobId);
    }

    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;
