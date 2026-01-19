import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  console.log('=== EMAIL API CALLED ===')
  
  try {
    const { jobId, email, sessionId } = await request.json()
    
    console.log('Email request:', { jobId, email, hasSessionId: !!sessionId })

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
      console.error('Job not found:', jobError)
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
      console.error('Signed URL error:', signError)
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    console.log('Sending email to:', email)

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Colour.page <noreply@colour.page>',
      to: email,
      subject: '🎨 Your Colouring Page is Ready!',
      html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <tr>
        <td>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Your Colouring Page is Ready! 🎨</h1>
        </td>
      </tr>
    </table>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background: white; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
      <tr>
        <td>
          <p style="font-size: 16px; margin: 0 0 20px 0; color: #333;">
            Thanks for using colour.page! Your AI-generated colouring page is ready to download.
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 8px;">
                      <a href="${signedData.signedUrl}" 
                         style="display: inline-block; color: white; text-decoration: none; padding: 16px 40px; font-weight: 600; font-size: 16px;">
                        Download Your Colouring Page
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0 0 0;">
            <tr>
              <td>
                <p style="font-size: 14px; color: #666; margin: 0 0 10px 0; font-weight: bold;">
                  Print &amp; Colour Tips:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 14px; color: #666; padding: 4px 0;">
                      • Print on white or light-colored paper for best results
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 14px; color: #666; padding: 4px 0;">
                      • Use standard printer settings (no scaling)
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 14px; color: #666; padding: 4px 0;">
                      • Works great with crayons, markers, or colored pencils
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <p style="font-size: 14px; color: #666; margin: 30px 0 0 0;">
            This download link will expire in 7 days.
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <tr>
              <td align="center">
                <p style="font-size: 12px; color: #999; margin: 0;">
                  Want to create more colouring pages?<br>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #10B981; text-decoration: none;">Visit colour.page</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
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

    console.log('Email sent successfully:', emailData?.id)

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