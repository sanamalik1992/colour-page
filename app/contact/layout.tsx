import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact colour.page',
  description: 'Get in touch with the colour.page team — questions, orders, cancellations or feedback. We reply as quickly as we can.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
