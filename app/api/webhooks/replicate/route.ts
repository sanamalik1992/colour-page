// app/api/webhooks/replicate/route.ts
// This route receives the webhook from Replicate when prediction completes

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const maxDuration = 30;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const prediction = await request.json();
    
    console.log('Webhook received:', prediction.id, prediction.status);

    // Find the job with this prediction ID
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('prediction_id', prediction.id)
      .single();

    if (jobError || !job) {
      console.error('Job not found for prediction:', prediction.id);
      // Still return 200 so Replicate doesn't retry
      return NextResponse.json({ received: true, error: 'Job not found' });
    }

    const jobId = job.id;

    // Check if prediction failed
    if (prediction.status === 'failed') {
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: prediction.error || 'Prediction failed'
        })
        .eq('id', jobId);
      
      return NextResponse.json({ received: true, status: 'failed' });
    }

    // Check if prediction succeeded
    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      
      // Get the output URL (array of URLs, take the first one which is lineart)
      let outputUrl: string;
      if (Array.isArray(output) && output.length > 0) {
        outputUrl = output[0];
      } else if (typeof output === 'string') {
        outputUrl = output;
      } else {
        throw new Error('Unexpected output format from model');
      }

      console.log(`Job ${jobId}: Downloading result from ${outputUrl.substring(0, 50)}...`);

      await supabase
        .from('jobs')
        .update({ progress: 70 })
        .eq('id', jobId);

      // Download the result image
      const imageResponse = await fetch(outputUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to download result image');
      }

      const rawBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // INVERT the image: lineart comes as white-on-black, we need black-on-white
      const imageBuffer = await sharp(rawBuffer)
        .negate()  // Invert colors
        .png()
        .toBuffer();

      await supabase
        .from('jobs')
        .update({ progress: 85 })
        .eq('id', jobId);

      // Upload to Supabase Storage
      const resultPath = `results/${jobId}.png`;
      
      // Try 'images' bucket first
      let uploadSuccess = false;
      const { error: err1 } = await supabase.storage
        .from('images')
        .upload(resultPath, imageBuffer, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (!err1) {
        uploadSuccess = true;
      } else {
        // Try 'uploads' bucket
        const { error: err2 } = await supabase.storage
          .from('uploads')
          .upload(resultPath, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (!err2) {
          uploadSuccess = true;
        } else {
          throw new Error(`Failed to upload result: ${err2.message}`);
        }
      }

      // Get public URL
      let publicUrl: string = resultPath;
      const { data: publicData1 } = supabase.storage
        .from('images')
        .getPublicUrl(resultPath);
      
      if (publicData1?.publicUrl) {
        publicUrl = publicData1.publicUrl;
      } else {
        const { data: publicData2 } = supabase.storage
          .from('uploads')
          .getPublicUrl(resultPath);
        if (publicData2?.publicUrl) {
          publicUrl = publicData2.publicUrl;
        }
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
        received: true, 
        status: 'completed',
        jobId 
      });
    }

    // For other statuses, just acknowledge
    return NextResponse.json({ received: true, status: prediction.status });

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Still return 200 so Replicate doesn't retry
    return NextResponse.json({ 
      received: true, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Also handle GET for verification if needed
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}