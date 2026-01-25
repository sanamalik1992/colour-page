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

    // Determine which lineart style to use based on complexity
    const complexity = job.complexity || 'medium';
    
    // Use lineart for realistic photos, lineart_anime for illustrations
    // For simple: just lineart (cleaner lines)
    // For detailed: both lineart options for more detail
    const useLineart = true;
    const useLineartAnime = complexity === 'detailed';

    console.log('Calling controlnet-preprocessors with lineart extraction');
    console.log('Image URL:', signedUrlData.signedUrl);
    console.log('Complexity:', complexity, '| lineart:', useLineart, '| lineart_anime:', useLineartAnime);

    // Call the preprocessor - disable everything except lineart
    // This makes it much faster (~8 seconds)
    const output = await replicate.run("fofr/controlnet-preprocessors", {
      input: {
        image: signedUrlData.signedUrl,
        // Disable all preprocessors except lineart
        canny: false,
        content: false,
        face_detector: false,
        hed: false,
        midas: false,
        mlsd: false,
        open_pose: false,
        pidi: false,
        normal_bae: false,
        lineart: useLineart,
        lineart_anime: useLineartAnime,
        sam: false,
        leres: false
      }
    });

    console.log('Replicate output:', output);
    console.log('Output type:', typeof output);

    // Output is an array of URLs for each enabled preprocessor
    let resultUrl: string;
    
    if (Array.isArray(output) && output.length > 0) {
      // Take the first result (lineart)
      resultUrl = output[0];
    } else if (typeof output === 'string') {
      resultUrl = output;
    } else {
      console.error('Unexpected output format:', output);
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
