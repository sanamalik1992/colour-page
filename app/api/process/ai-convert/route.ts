import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';

export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update status to processing
    await supabase
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // Get the original image URL from Supabase Storage
    const { data: signedUrlData } = await supabase.storage
      .from('uploads')
      .createSignedUrl(job.original_path, 3600); // 1 hour expiry

    if (!signedUrlData?.signedUrl) {
      throw new Error('Failed to get signed URL for original image');
    }

    // Initialize Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Build prompt based on complexity
    const complexity = job.complexity || 'medium';
    let prompt: string;
    
    if (complexity === 'simple') {
      prompt = "Convert this photo into a simple black and white line art coloring page for young children. Use thick, bold outlines only. Remove all details, shading, and textures. Pure black lines on pure white background. Very simple shapes suitable for toddlers to color.";
    } else if (complexity === 'detailed') {
      prompt = "Convert this photo into a detailed black and white line art coloring page. Include fine details and intricate patterns. Pure black lines on pure white background. No shading or gradients, just clean line work suitable for adults or older children who enjoy detailed coloring.";
    } else {
      prompt = "Convert this photo into a black and white line art coloring page. Medium level of detail with clear outlines. Pure black lines on pure white background. No shading or gradients. Suitable for children to color in.";
    }

    console.log('Calling Nano Banana with prompt:', prompt);
    console.log('Image URL:', signedUrlData.signedUrl);

    // Call Nano Banana model - image_input is an ARRAY
    const output = await replicate.run("google/nano-banana", {
      input: {
        prompt: prompt,
        image_input: [signedUrlData.signedUrl],  // Must be an array!
        output_format: "png"
      }
    });

    console.log('Replicate output:', output);
    console.log('Output type:', typeof output);

    // Output is a string URL directly (not an array)
    let resultUrl: string;
    
    if (typeof output === 'string') {
      resultUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      // Fallback in case it returns an array
      resultUrl = output[0];
    } else if (output && typeof output === 'object') {
      // Check if it's an object with a url property
      const outputObj = output as Record<string, unknown>;
      if (typeof outputObj.url === 'string') {
        resultUrl = outputObj.url;
      } else if (typeof outputObj.output === 'string') {
        resultUrl = outputObj.output;
      } else {
        console.error('Unexpected output structure:', JSON.stringify(output));
        throw new Error('Model returned unexpected output format');
      }
    } else {
      console.error('Unexpected output type:', typeof output, output);
      throw new Error('Model returned unexpected output format');
    }

    console.log('Result URL:', resultUrl);

    // Download the result image
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download result image: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to Supabase Storage
    const resultPath = `results/${jobId}.png`;
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(resultPath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload result: ${uploadError.message}`);
    }

    // Get public URL for the result
    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(resultPath);

    // Update job with result
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        result_path: resultPath,
        result_url: publicUrlData.publicUrl
      })
      .eq('id', jobId);

    return NextResponse.json({
      success: true,
      resultUrl: publicUrlData.publicUrl
    });

  } catch (error) {
    console.error('Processing error:', error);
    
    // Try to update job status to failed
    try {
      const { jobId } = await request.clone().json();
      if (jobId) {
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', jobId);
      }
    } catch (e) {
      console.error('Failed to update job status:', e);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
