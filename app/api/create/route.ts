import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getString(formData: FormData, key: string): string {
  const val = formData.get(key);
  return typeof val === "string" ? val : "";
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client INSIDE the handler (avoid build-time env eval)
    const supabase = await createClient();

    const formData = await request.formData();

    const fileValue = formData.get("file");
    const file = fileValue instanceof File ? fileValue : null;

    const complexity = getString(formData, "complexity") || "simple";
    const instructions = getString(formData, "instructions");
    const customText = getString(formData, "customText");
    const addTextOverlay = getString(formData, "addTextOverlay") === "true";
    const sessionId = getString(formData, "sessionId") || nanoid(12);

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WEBP are allowed" },
        { status: 400 }
      );
    }

    // Determine extension safely
    const originalName = file.name || "upload";
    const extFromName = originalName.includes(".")
      ? originalName.split(".").pop()?.toLowerCase()
      : undefined;

    const fileExt =
      extFromName && extFromName.length <= 5 ? extFromName : "png";

    const fileName = `${nanoid()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        session_id: sessionId,
        upload_path: filePath,
        original_filename: originalName,
        status: "pending",
        complexity,
        instructions: instructions || null,
        custom_text: customText || null,
        add_text_overlay: addTextOverlay,
        progress: 0,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("Job creation error:", jobError);
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 }
      );
    }

    // Trigger processing (use relative URL — no NEXT_PUBLIC_APP_URL needed)
    fetch(new URL("/api/process", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((err: unknown) => console.error("Failed to trigger processing:", err));

    return NextResponse.json({ jobId: job.id, status: "success" });
  } catch (error: unknown) {
    console.error("Create job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
