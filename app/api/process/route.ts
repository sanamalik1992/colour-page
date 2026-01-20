import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
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

/**
 * Professional coloring page generation using Sharp
 * This implements the same algorithm as the OpenCV version
 */
async function photoToColoringPage(
  inputBuffer: Buffer,
  lineThickness: number = 3,
  edgeSensitivity: number = 100,
  noiseReduction: number = 3
): Promise<Buffer> {
  
  console.log("=== STARTING PROFESSIONAL COLORING PAGE GENERATION ===");
  console.log(`Parameters: lineThickness=${lineThickness}, edgeSensitivity=${edgeSensitivity}, noiseReduction=${noiseReduction}`);
  
  // =====================================================================
  // STEP 1: LOAD AND CONVERT TO GRAYSCALE
  // =====================================================================
  // Why: Color is irrelevant for line art. Grayscale focuses on brightness
  // which defines edges and shapes.
  console.log("Step 1: Converting to grayscale...");
  let processed = await sharp(inputBuffer)
    .resize(2000, 2000, { 
      fit: 'inside', 
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3  // High-quality resize
    })
    .greyscale()
    .toBuffer();
  
  // =====================================================================
  // STEP 2: NOISE REDUCTION (BILATERAL FILTER SIMULATION)
  // =====================================================================
  // Why: Removes noise while preserving edges. In Sharp, we simulate this
  // with a combination of blur and sharpen to preserve edges.
  console.log("Step 2: Reducing noise while preserving edges...");
  
  // Light blur to reduce noise
  processed = await sharp(processed)
    .blur(1.5)
    .toBuffer();
  
  // Sharpen to restore edge definition
  processed = await sharp(processed)
    .sharpen({ sigma: 2 })
    .toBuffer();
  
  // =====================================================================
  // STEP 3: ENHANCE CONTRAST (CLAHE SIMULATION)
  // =====================================================================
  // Why: Increases local contrast making edges more pronounced.
  // We normalize and then boost contrast.
  console.log("Step 3: Enhancing contrast...");
  processed = await sharp(processed)
    .normalize()  // Stretch histogram
    .linear(1.8, -(128 * 1.8) + 128)  // Boost contrast
    .toBuffer();
  
  // =====================================================================
  // STEP 4: EDGE DETECTION (CANNY SIMULATION WITH CONVOLUTION)
  // =====================================================================
  // Why: Find boundaries between different brightness regions.
  // Sharp doesn't have Canny, so we use Laplacian edge detection.
  console.log("Step 4: Detecting edges...");
  
  // The edge sensitivity parameter controls how many edges we detect
  // Lower sensitivity = more edges, higher sensitivity = fewer edges
  const edgeStrength = edgeSensitivity < 100 ? 16 : edgeSensitivity > 100 ? 8 : 12;
  
  // Laplacian kernel for edge detection
  // Negative values on edges, positive in center
  const laplacianKernel = [
    -1, -1, -1,
    -1, edgeStrength, -1,
    -1, -1, -1
  ];
  
  let edges = await sharp(processed)
    .convolve({
      width: 3,
      height: 3,
      kernel: laplacianKernel,
      scale: 1,
      offset: 0
    })
    .toBuffer();
  
  // Enhance edge visibility
  edges = await sharp(edges)
    .normalize()
    .linear(2.5, -(128 * 2.5) + 128)
    .toBuffer();
  
  // =====================================================================
  // STEP 5: THRESHOLD TO BLACK AND WHITE
  // =====================================================================
  // Why: Convert grayscale edges to pure black/white.
  console.log("Step 5: Converting to black and white...");
  
  const thresholdValue = edgeSensitivity > 100 ? 120 : 100;
  
  let blackWhite = await sharp(edges)
    .threshold(thresholdValue)
    .negate()  // Invert so lines are black
    .toBuffer();
  
  // =====================================================================
  // STEP 6: THICKEN LINES (DILATION)
  // =====================================================================
  // Why: Make lines bold enough for kids to color inside.
  console.log("Step 6: Thickening lines...");
  
  // Map line thickness to kernel size
  const dilationSize = Math.max(3, lineThickness + 1);
  const dilationKernel = Array(dilationSize * dilationSize).fill(1);
  
  blackWhite = await sharp(blackWhite)
    .convolve({
      width: dilationSize,
      height: dilationSize,
      kernel: dilationKernel,
      scale: 1,
      offset: 0
    })
    .threshold(200)  // Re-threshold after dilation
    .toBuffer();
  
  // =====================================================================
  // STEP 7: REMOVE SMALL NOISE (MORPHOLOGICAL OPENING)
  // =====================================================================
  // Why: Remove tiny dots and specks from texture/background.
  console.log("Step 7: Removing noise specks...");
  
  // Median filter removes small noise
  const medianSize = Math.min(5, noiseReduction + 1);
  blackWhite = await sharp(blackWhite)
    .median(medianSize)
    .toBuffer();
  
  // =====================================================================
  // STEP 8: CLOSE SMALL GAPS IN LINES
  // =====================================================================
  // Why: Connect broken lines for continuous outlines.
  console.log("Step 8: Closing gaps in lines...");
  
  const closingKernel = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  blackWhite = await sharp(blackWhite)
    .convolve({
      width: 3,
      height: 3,
      kernel: closingKernel,
      scale: 1,
      offset: 0
    })
    .threshold(200)
    .toBuffer();
  
  // =====================================================================
  // STEP 9: FORCE PURE BLACK (0) AND WHITE (255)
  // =====================================================================
  // Why: Ensure no gray pixels remain. Critical for clean printing.
  console.log("Step 9: Enforcing pure black and white...");
  
  const { data, info } = await sharp(blackWhite)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const pixels = new Uint8Array(data.buffer);
  
  // Force every pixel to either 0 or 255
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = pixels[i] < 128 ? 0 : 255;
  }
  
  const pureBW = await sharp(Buffer.from(pixels), {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
  
  // =====================================================================
  // STEP 10: SMOOTH JAGGED EDGES
  // =====================================================================
  // Why: Remove pixelation while keeping lines crisp.
  console.log("Step 10: Smoothing jagged edges...");
  
  const smoothed = await sharp(pureBW)
    .blur(0.5)
    .threshold(128)
    .toBuffer();
  
  console.log("✓ Coloring page processing complete!");
  
  return smoothed;
}

/**
 * Layout coloring page on A4 canvas with margins
 */
async function layoutToA4(contentBuffer: Buffer): Promise<Buffer> {
  console.log("Laying out on A4 canvas...");
  
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
        left: Math.floor((A4_WIDTH - contentWidth) / 2),
        top: Math.floor((A4_HEIGHT - contentHeight) / 2),
      },
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  console.log("✓ A4 layout complete!");
  
  return a4Page;
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null;

  try {
    const body = await request.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    console.log("\n" + "=".repeat(60));
    console.log("PROFESSIONAL COLORING PAGE GENERATION");
    console.log("Job ID:", jobId);
    console.log("=".repeat(60) + "\n");

    const supabase = createServiceClient();

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await updateJobProgress(supabase, jobId, 10, "processing");

    // Download original image
    console.log("Downloading original image from storage...");
    const { data: imageData, error: downloadError } = await supabase.storage
      .from("images")
      .download(job.upload_path);

    if (downloadError || !imageData) {
      throw new Error("Failed to download image");
    }

    const buffer = await imageData.arrayBuffer();
    console.log(`Image downloaded: ${buffer.byteLength} bytes`);
    
    await updateJobProgress(supabase, jobId, 20);

    // Determine parameters based on complexity
    const isDetailed = job.complexity === "detailed";
    
    const params = isDetailed
      ? {
          lineThickness: 2,      // Finer lines for detailed work
          edgeSensitivity: 85,   // More edges
          noiseReduction: 2,     // Keep more detail
        }
      : {
          lineThickness: 3,      // Bold lines for kids
          edgeSensitivity: 105,  // Simpler, fewer edges
          noiseReduction: 3,     // Clean background
        };

    console.log("\nProcessing parameters:", params);

    // Generate coloring page
    const coloringPage = await photoToColoringPage(
      Buffer.from(buffer),
      params.lineThickness,
      params.edgeSensitivity,
      params.noiseReduction
    );

    await updateJobProgress(supabase, jobId, 70);

    // Layout to A4
    const a4Page = await layoutToA4(coloringPage);
    await updateJobProgress(supabase, jobId, 85);

    // Upload result
    const resultPath = `results/${nanoid()}.png`;
    console.log("\nUploading result to storage...");

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(resultPath, a4Page, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    await updateJobProgress(supabase, jobId, 95);

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

    console.log("\n" + "=".repeat(60));
    console.log("✓ JOB COMPLETED SUCCESSFULLY");
    console.log("Output:", resultPath);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("✗ JOB FAILED");
    console.error("Error:", error);
    console.error("=".repeat(60) + "\n");

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

export const maxDuration = 60;