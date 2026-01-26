cat > app/api/webhooks/replicate/route.ts << 'EOF'
// app/api/webhooks/replicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const prediction = await request.json();
    
    console.log('Webhook received:', prediction.id, prediction.status);

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
      if (typeof output === 'string') {
        outputUrl = output;
      } else if (Array.isArray(output) && output.length > 0) {
        outputUrl = output[0];
      } else if (output && typeof output === 'object' && 'url' in output) {
        outputUrl = (output as { url: string }).url;
      } else {
        throw new Error('Unexpected output format from model');
      }

      console.log(`Job ${jobId}: Downloading result...`);

      await supabase
        .from('jobs')
        .update({ progress: 70 })
        .eq('id', jobId);

      const imageResponse = await fetch(outputUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to download result image');
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      await supabase
        .from('jobs')
        .update({ progress: 85 })
        .eq('id', jobId);

      const resultPath = `results/${jobId}.png`;