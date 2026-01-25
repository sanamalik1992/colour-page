// app/api/process/ai-convert/route.ts
// This route STARTS the prediction and returns immediately
// The webhook route will handle completion

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

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

    // Get signed URL for the image - try both buckets
    let signedUrl: string | null = null;
    
    const { data: signedData1 } = await supabase.storage
      .from('images')
      .createSignedUrl(uploadPath, 3600);
    
    if (signedData1?.signedUrl) {
      signedUrl = signedData1.signedUrl;
    } else {
      const { data: signedData2 } = await supabase.storage
        .from('uploads')
        .createSignedUrl(uploadPath, 3600);
      signedUrl = signedData2?.signedUrl || null;
    }

    if (!signedUrl) {
      throw new Error('Failed to get signed URL for image');
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }

    // Get the webhook URL - your deployed domain
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (!webhookUrl) {
      throw new Error('App URL not configured for webhooks');
    }

    const fullWebhookUrl = webhookUrl.startsWith('http') 
      ? `${webhookUrl}/api/webhooks/replicate`
      : `https://${webhookUrl}/api/webhooks/replicate`;

    console.log(`Job ${jobId}: Starting prediction with webhook: ${fullWebhookUrl}`);

    // Create prediction with WEBHOOK - returns immediately
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Using fofr/controlnet-preprocessors for lineart extraction
        version: 'f6584ef76cf07a2014ffe1e9bdb1a5cfa714f031883ab43f8d4b05506625988e',
        input: {
          image: signedUrl,
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
        },
        // Webhook will be called when prediction completes
        webhook: fullWebhookUrl,
        webhook_events_filter: ['completed']
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create prediction: ${errorText}`);
    }

    const prediction = await createResponse.json();
    console.log(`Job ${jobId}: Prediction started: ${prediction.id}`);

    // Store the prediction ID in the job for tracking
    await supabase
      .from('jobs')
      .update({ 
        progress: 30,
        prediction_id: prediction.id  // Store this to match webhook later
      })
      .eq('id', jobId);

    // Return immediately - webhook will handle completion
    return NextResponse.json({
      success: true,
      status: 'processing',
      predictionId: prediction.id,
      message: 'Processing started. Poll job status for updates.'
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
