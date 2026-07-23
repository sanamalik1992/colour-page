import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

// Where contact-form messages are delivered.
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'colour.page123@gmail.com'
// Resend SENDER — must be a verified domain (Resend rejects a gmail "from"),
// so this stays on colour.page; replies are routed to the visitor's own email.
const FROM_EMAIL = process.env.RESEND_FROM || 'colour.page <noreply@colour.page>'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Please fill in all fields.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      // Email delivery isn't configured — be honest rather than pretend it sent.
      return NextResponse.json(
        {
          error: 'Our contact form is temporarily unavailable.',
          contactEmail: CONTACT_EMAIL,
        },
        { status: 503 }
      )
    }

    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `New contact message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    })

    if (error) {
      console.error('Contact email error:', error)
      return NextResponse.json(
        { error: 'Failed to send your message. Please try again.', contactEmail: CONTACT_EMAIL },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
