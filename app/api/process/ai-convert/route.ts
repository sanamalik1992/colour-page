import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import sharp from "sharp";
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

    // Download original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("images")
      .download(uploadPath);

    if (downloadError || !fileData) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "Failed to download uploaded image" })
        .eq("id", jobId);
      return NextResponse.json({ error: "Failed to download uploaded image" }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    await supabase.from("jobs").update({ progress: 25 }).eq("id", jobId);

    console.log(`Job ${jobId}: Processing image with Sharp edge detection...`);

    // Determine settings based on complexity
    const isDetailed = job.complexity === "detailed";
    
    // Edge detection parameters
    const blurSigma = isDetailed ? 0.5 : 1.0; // Less blur = more detail
    const threshold = isDetailed ? 20 : 35; // Lower threshold = more lines
    const lineThickness = isDetailed ? 1 : 2;

    // Step 1: Load and resize image to a good working size
    const resizedImage = await sharp(inputBuffer)
      .resize(1024, 1024, { 
        fit: 'inside', 
        withoutEnlargement: false 
      })
      .toBuffer();

    await supabase.from("jobs").update({ progress: 35 }).eq("id", jobId);

    // Step 2: Convert to grayscale
    const grayscale = await sharp(resizedImage)
      .grayscale()
      .toBuffer();

    await supabase.from("jobs").update({ progress: 45 }).eq("id", jobId);

    // Step 3: Apply slight blur to reduce noise
    const blurred = await sharp(grayscale)
      .blur(blurSigma)
      .toBuffer();

    await supabase.from("jobs").update({ progress: 55 }).eq("id", jobId);

    // Step 4: Edge detection using Laplacian-like convolution
    // This creates a edge-detected version
    const edges = await sharp(blurred)
      .convolve({
        width: 3,
        height: 3,
        kernel: [
          -1, -1, -1,
          -1,  8, -1,
          -1, -1, -1
        ],
        scale: 1,
        offset: 128,
      })
      .toBuffer();

    await supabase.from("jobs").update({ progress: 65 }).eq("id", jobId);

    // Step 5: Normalize and threshold to get clean black lines on white
    const normalized = await sharp(edges)
      .normalize()
      .toBuffer();

    await supabase.from("jobs").update({ progress: 75 }).eq("id", jobId);

    // Step 6: Threshold to pure black and white, then negate for black lines on white
    const { data: rawData, info } = await sharp(normalized)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Apply threshold manually for cleaner results
    const thresholdedData = Buffer.alloc(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      // Pixels darker than threshold become black (lines), others become white
      thresholdedData[i] = rawData[i] < threshold ? 0 : 255;
    }

    // Convert back to image and negate (so lines are black on white background)
    let finalImage = await sharp(thresholdedData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels as 1 | 2 | 3 | 4,
      },
    })
      .negate() // Invert: black lines on white background
      .png()
      .toBuffer();

    // Step 7: Dilate lines if needed (make them thicker for coloring)
    if (lineThickness > 1) {
      // Apply a slight median filter to thicken lines
      finalImage = await sharp(finalImage)
        .median(lineThickness)
        .negate() // Median + negate combo thickens dark lines
        .negate()
        .png()
        .toBuffer();
    }

    await supabase.from("jobs").update({ progress: 85 }).eq("id", jobId);

    // Step 8: Final cleanup - ensure pure white background
    const outputBuffer = await sharp(finalImage)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    // Store result in Supabase Storage
    const resultPath = `results/${nanoid()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(resultPath, outputBuffer, {
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
