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
      return NextResponse.json({ received: true, error: 'Job not found' });
    }

    const jobId = job.id;

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

    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      
      let outputUrl: string;
      if (Array.isArray(output) && output.length > 0) {
        outputUrl = output[0];
      } else if (typeof output === 'string') {
        outputUrl = output;
      } else {
        throw new Error('Unexpected output format from model');
      }

      console.log(`Job ${jobId}: Downloading result...`);

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

      // POST-PROCESS for clean coloring page:
      // The lineart model outputs white lines on black background
      // We need to invert and enhance for a proper coloring page
      const imageBuffer = await sharp(rawBuffer)
        // Invert: black lines on white background
        .negate()
        // Convert to grayscale
        .grayscale()
        // Normalize to use full range (enhances contrast)
        .normalize()
        // Apply a lower threshold to keep more detail (lower = more black pixels kept)
        .threshold(128)
        // Ensure white background
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        // Output as PNG
        .png()
        .toBuffer();

      await supabase
        .from('jobs')
        .update({ progress: 85 })
        .eq('id', jobId);

      // Upload to Supabase Storage
      const resultPath = `results/${jobId}.png`;
      
      // Try 'images' bucket first
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
        
        if (err2) {
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

    return NextResponse.json({ received: true, status: prediction.status });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      received: true, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}
