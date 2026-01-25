import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let jobId: string | undefined;
  
  try {
    const body = await request.json();
    jobId = body.jobId;
    
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
      .update({ status: 'processing', progress: 10 })
      .eq('id', jobId);

    // Get the upload path
    const uploadPath = job.upload_path || job.original_path || job.preview_url;
    
    if (!uploadPath) {
      throw new Error('No upload path found on job');
    }

    // Get signed URL for the image
    // Try 'images' bucket first
    let signedUrl: string | null = null;
    
    const { data: signedData1 } = await supabase.storage
      .from('images')
      .createSignedUrl(uploadPath, 3600);
    
    if (signedData1?.signedUrl) {
      signedUrl = signedData1.signedUrl;
    } else {
      // Try 'uploads' bucket
      const { data: signedData2 } = await supabase.storage
        .from('uploads')
        .createSignedUrl(uploadPath, 3600);
      signedUrl = signedData2?.signedUrl || null;
    }

    if (!signedUrl) {
      throw new Error('Failed to get signed URL for image');
    }

    await supabase
      .from('jobs')
      .update({ progress: 20 })
      .eq('id', jobId);

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }

    console.log(`Job ${jobId}: Starting Replicate prediction...`);

    // Create prediction using Replicate API directly (faster than SDK)
    // Using fofr/controlnet-preprocessors which runs in ~8 seconds
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'f6584ef76cf07a2014ffe1e9bdb1a5cfa714f031883ab43f8d4b05506625988e',
        input: {
          image: signedUrl,
          // Only enable lineart - disable everything else for speed
          canny: false,
          content: false,
          face_detector: false,
          hed: false,
          midas: false,
          mlsd: false,
          open_pose: false,
          pidi: false,
          normal_bae: false,
          lineart: true,
          lineart_anime: false,
          sam: false,
          leres: false
        }
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create prediction: ${errorText}`);
    }

    const prediction = await createResponse.json();
    console.log(`Job ${jobId}: Prediction created: ${prediction.id}`);

    await supabase
      .from('jobs')
      .update({ progress: 30 })
      .eq('id', jobId);

    // Poll for completion (max 50 seconds to stay under 60s limit)
    const startTime = Date.now();
    const maxWaitTime = 50000; // 50 seconds
    let result = prediction;

    while (result.status !== 'succeeded' && result.status !== 'failed') {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Prediction timed out');
      }

      // Wait 1 second between polls
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
        }
      });

      if (!pollResponse.ok) {
        throw new Error('Failed to poll prediction status');
      }

      result = await pollResponse.json();
      
      // Update progress based on elapsed time
      const elapsed = Date.now() - startTime;
      const progress = Math.min(30 + Math.floor((elapsed / maxWaitTime) * 40), 70);
      await supabase
        .from('jobs')
        .update({ progress })
        .eq('id', jobId);
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Prediction failed');
    }

    console.log(`Job ${jobId}: Prediction completed`);

    // Get the output URL (array of URLs, take the first one which is lineart)
    const output = result.output;
    let outputUrl: string;

    if (Array.isArray(output) && output.length > 0) {
      outputUrl = output[0];
    } else if (typeof output === 'string') {
      outputUrl = output;
    } else {
      throw new Error('Unexpected output format from model');
    }

    await supabase
      .from('jobs')
      .update({ progress: 75 })
      .eq('id', jobId);

    // Download the result
    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download result image');
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    await supabase
      .from('jobs')
      .update({ progress: 85 })
      .eq('id', jobId);

    // Upload to Supabase Storage
    const resultPath = `results/${jobId}.png`;
    
    // Try 'images' bucket first
    let uploadError;
    const { error: err1 } = await supabase.storage
      .from('images')
      .upload(resultPath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (err1) {
      // Try 'uploads' bucket
      const { error: err2 } = await supabase.storage
        .from('uploads')
        .upload(resultPath, imageBuffer, {
          contentType: 'image/png',
          upsert: true
        });
      uploadError = err2;
    }

    if (uploadError) {
      throw new Error(`Failed to upload result: ${uploadError.message}`);
    }

    // Get public URL - try both buckets
    let publicUrl: string;
    const { data: publicData1 } = supabase.storage
      .from('images')
      .getPublicUrl(resultPath);
    
    if (publicData1?.publicUrl) {
      publicUrl = publicData1.publicUrl;
    } else {
      const { data: publicData2 } = supabase.storage
        .from('uploads')
        .getPublicUrl(resultPath);
      publicUrl = publicData2?.publicUrl || resultPath;
    }

    // Update job as completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        result_url: resultPath,
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`Job ${jobId}: Completed successfully!`);

    return NextResponse.json({
      success: true,
      resultUrl: publicUrl
    });

  } catch (error) {
    console.error('Processing error:', error);
    
    if (jobId) {
      await supabase
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', jobId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
