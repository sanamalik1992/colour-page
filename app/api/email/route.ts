import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { jobId, email, sessionId } = await request.json()

    if (!jobId || !email) {
      return NextResponse.json(
        { error: 'Job ID and email required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Validate session ownership
    if (job.session_id && job.session_id !== sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if job is completed
    if (job.status !== 'completed' || !job.result_url) {
      return NextResponse.json(
        { error: 'Job not completed yet' },
        { status: 400 }
      )
    }

    // Generate signed download URL (valid for 7 days)
    const { data: signedData, error: signError } = await supabase.storage
      .from('images')
      .createSignedUrl(job.result_url, 604800) // 7 days

    if (signError || !signedData) {
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'colour.page <noreply@colour.page>',
      to: email,
      subject: '🎨 Your Colouring Page is Ready!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Your Colouring Page is Ready! 🎨</h1>
            </div>
            
            <div style="background: white; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Thanks for using colour.page! Your AI-generated colouring page is ready to download.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signedData.signedUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Download Your Colouring Page
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                <strong>Print & Colour Tips:</strong>
              </p>
              <ul style="font-size: 14px; color: #666;">
                <li>Print on white or light-colored paper for best results</li>
                <li>Use standard printer settings (no scaling)</li>
                <li>Works great with crayons, markers, or colored pencils</li>
              </ul>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                This download link will expire in 7 days.
              </p>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center;">
                <p style="font-size: 12px; color: #999;">
                  Want to create more colouring pages?<br>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #10B981; text-decoration: none;">Visit colour.page</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (emailError) {
      console.error('Email send error:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Record email delivery
    await supabase
      .from('email_deliveries')
      .insert({
        job_id: jobId,
        email: email,
        status: 'sent',
        delivery_id: emailData?.id
      })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}