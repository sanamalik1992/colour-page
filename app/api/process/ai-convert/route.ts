import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import OpenAI from "openai";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export async function POST(request: NextRequest) {
  const supabase = supabaseAdmin;

  try {
    const body = await request.json().catch(() => ({}));
    const jobId: string | undefined = body?.jobId;

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
    const { error: startErr } = await supabase
      .from("jobs")
      .update({ status: "processing", progress: 10, error_message: null })
      .eq("id", jobId);

    if (startErr) {
      console.error("Failed to set job to processing:", startErr);
    }

    // upload_path is the canonical field in your DB
    const uploadPath: string | undefined = job.upload_path || job.preview_url;

    if (!uploadPath) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "No upload path on job (missing upload_path)",
        })
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
        .update({
          status: "failed",
          error_message: "Failed to download uploaded image",
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "Failed to download uploaded image" },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Blob.type is safest (no any)
    const mimeType =
      fileData instanceof Blob && fileData.type ? fileData.type : "image/jpeg";

    const base64Image = buffer.toString("base64");

    if (!openai) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "OPENAI_API_KEY not configured",
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Progress: generating prompt
    const { error: p25Err } = await supabase
      .from("jobs")
      .update({ progress: 25 })
      .eq("id", jobId);

    if (p25Err) console.error("Failed to update progress to 25:", p25Err);

    // 1) Vision prompt generation
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
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
              text:
                `Analyze this photo and write a prompt to generate a black-and-white colouring page version.\n` +
                `Requirements:\n` +
                `- Bold black outlines on white background\n` +
                `- No shading/grey/gradients\n` +
                `- Keep key features, simplify details\n` +
                `- Suitable for kids to colour\n` +
                `Return ONLY the prompt text.`,
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const prompt = visionResponse.choices?.[0]?.message?.content?.trim();
    if (!prompt) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "No prompt returned from GPT-4o",
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "No prompt returned from GPT-4o" },
        { status: 500 }
      );
    }

    // Progress: generating image
    const { error: p55Err } = await supabase
      .from("jobs")
      .update({ progress: 55 })
      .eq("id", jobId);

    if (p55Err) console.error("Failed to update progress to 55:", p55Err);

    // 2) Generate colouring page image
    // IMPORTANT: Do NOT pass response_format (your error)
    const imageResponse = await openai.images.generate({
      model: "gpt-image-1-mini",
      prompt:
        `${prompt}\n\nCRITICAL:\n` +
        `- Pure black lines on pure white background\n` +
        `- No grey tones, no shading, no gradients\n` +
        `- Bold outlines, clean line art only\n` +
        `- A4 printable colouring book style`,
      n: 1,
      size: "1024x1024",
      // If your SDK ever complains about this field, remove it.
      quality: "standard",
    });

    const b64 = imageResponse.data?.[0]?.b64_json;
    if (!b64) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "OpenAI returned no image data (b64_json missing)",
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "OpenAI returned no image data" },
        { status: 500 }
      );
    }

    const generatedBuffer = Buffer.from(b64, "base64");

    const { error: p85Err } = await supabase
      .from("jobs")
      .update({ progress: 85 })
      .eq("id", jobId);

    if (p85Err) console.error("Failed to update progress to 85:", p85Err);

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
    const { error: doneErr } = await supabase
      .from("jobs")
      .update({
        status: "completed",
        result_url: resultPath,
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (doneErr) console.error("Failed to set job completed:", doneErr);

    return NextResponse.json({ success: true, jobId, resultPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("AI convert error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
