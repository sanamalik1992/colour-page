import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import OpenAI from "openai";
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
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = fileData.type || "image/jpeg";
    const base64Image = buffer.toString("base64");

    await supabase.from("jobs").update({ progress: 20 }).eq("id", jobId);

    if (!process.env.OPENAI_API_KEY) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "OPENAI_API_KEY not configured" })
        .eq("id", jobId);
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Step 1: Use GPT-4o to analyze the image and create a detailed description
    await supabase.from("jobs").update({ progress: 30 }).eq("id", jobId);

    console.log(`Job ${jobId}: Analyzing image with GPT-4o...`);

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: `Briefly describe the main subject in this image for a coloring page. Max 50 words. Focus on shape and outline only.`,
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    const imageDescription = visionResponse.choices?.[0]?.message?.content?.trim();
    
    if (!imageDescription) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "Failed to analyze image" })
        .eq("id", jobId);
      return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 });
    }

    console.log(`Job ${jobId}: Image description: ${imageDescription.substring(0, 100)}...`);

    await supabase.from("jobs").update({ progress: 50 }).eq("id", jobId);

    // Step 2: Generate coloring page with DALL-E 3
    console.log(`Job ${jobId}: Generating coloring page with DALL-E 3...`);

    const dallePrompt = `Simple black and white coloring book page of: ${imageDescription}. Bold black outlines on white background. No shading, no gray, no gradients. Clean line art for children to color.`;

    const imageResponse = await openai.images.generate({
      model: "dall-e-2",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
    });

    const generatedImageUrl = imageResponse.data?.[0]?.url;

    if (!generatedImageUrl) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "DALL-E returned no image" })
        .eq("id", jobId);
      return NextResponse.json({ error: "DALL-E returned no image" }, { status: 500 });
    }

    console.log(`Job ${jobId}: DALL-E image generated, downloading...`);

    await supabase.from("jobs").update({ progress: 75 }).eq("id", jobId);

    // Download the generated image
    const imageDownloadResponse = await fetch(generatedImageUrl);
    if (!imageDownloadResponse.ok) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: "Failed to download generated image" })
        .eq("id", jobId);
      return NextResponse.json({ error: "Failed to download generated image" }, { status: 500 });
    }

    const generatedBuffer = Buffer.from(await imageDownloadResponse.arrayBuffer());

    await supabase.from("jobs").update({ progress: 85 }).eq("id", jobId);

    // Store result in Supabase Storage
    const resultPath = `results/${nanoid()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(resultPath, generatedBuffer, {
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
